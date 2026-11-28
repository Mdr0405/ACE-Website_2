import ExcelJS from 'exceljs';
import { requireAdmin } from '@/lib/admin';
import { parseQuestions, resolveRecruitmentCluster } from '@/lib/recruitment';

export const dynamic = 'force-dynamic';

type Cell = string | number;

// Applicant text ends up in Excel, so neutralise formula injection
function safe(value: unknown): Cell {
  if (value == null) return '';
  const text =
    typeof value === 'string' ? value : typeof value === 'number' ? String(value) : JSON.stringify(value);
  return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const { supabase, cluster: adminCluster, isCore } = await requireAdmin();

  const requested = resolveRecruitmentCluster(url.searchParams.get('cluster'));
  const cluster = isCore ? requested : resolveRecruitmentCluster(adminCluster);
  if (!cluster) return new Response('Not found', { status: 404 });
  if (!isCore && requested && requested !== cluster) return new Response('Forbidden', { status: 403 });

  const format = url.searchParams.get('format') === 'xlsx' ? 'xlsx' : 'csv';

  const { data: form } = await supabase
    .from('RecruitmentForm')
    .select('questions')
    .eq('Cluster', cluster)
    .maybeSingle();
  const questions = parseQuestions(form?.questions);

  // Page through every application (PostgREST returns max 1000 per request)
  const applications: Record<string, any>[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('RecruitmentApplication')
      .select('*')
      .eq('Cluster', cluster)
      .order('submittedAt', { ascending: true })
      .range(from, from + 999);
    if (error) return new Response('Could not load responses', { status: 500 });
    applications.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }

  // Answers to questions that were later removed still get a column
  const knownIds = new Set(questions.map((q) => q.id));
  const orphanIds: string[] = [];
  for (const app of applications) {
    for (const key of Object.keys((app.answers ?? {}) as object)) {
      if (!knownIds.has(key) && !orphanIds.includes(key)) orphanIds.push(key);
    }
  }

  const headers = [
    'Submitted at',
    'Full name',
    'Registration number',
    'Course',
    'Year',
    ...questions.map((q) => q.label),
    ...orphanIds.map((id) => `${id} (removed question)`),
  ];

  const rows: Cell[][] = applications.map((app) => {
    const answers = (app.answers ?? {}) as Record<string, unknown>;
    return [
      app.submittedAt ? new Date(app.submittedAt).toISOString() : '',
      safe(app.fullName),
      safe(app.registrationNumber),
      safe(app.course),
      app.year ?? '',
      ...questions.map((q) => safe(answers[q.id])),
      ...orphanIds.map((id) => safe(answers[id])),
    ];
  });

  const filename = `${cluster.toLowerCase().replace(/[^a-z0-9]/g, '-')}-responses-${new Date()
    .toISOString()
    .slice(0, 10)}`;

  if (format === 'xlsx') {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Responses');
    sheet.addRow(headers).font = { bold: true };
    rows.forEach((row) => sheet.addRow(row));
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    sheet.columns.forEach((column) => {
      column.width = 24;
      column.alignment = { vertical: 'top', wrapText: true };
    });
    const buffer = await workbook.xlsx.writeBuffer();
    return new Response(new Uint8Array(buffer as ArrayBuffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}.xlsx"`,
        'Cache-Control': 'no-store',
      },
    });
  }

  const escape = (cell: Cell) => `"${String(cell).replace(/"/g, '""')}"`;
  const csv = '\uFEFF' + [headers, ...rows].map((row) => row.map(escape).join(',')).join('\r\n');
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
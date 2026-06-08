import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, ShadingType, AlignmentType, BorderStyle, HeadingLevel,
  LevelFormat, PageNumber, Header, Footer, PageOrientation } from 'docx'

const NAVY = '0D1B3E'
const BLUE = '1565C0'
const LTBLUE = 'DBEAFE'
const GRAY = '64748B'
const DARK = '0F172A'
const WHITE = 'FFFFFF'
const BORDER = 'E2E8F0'

const HOT_BG = 'FEF3C7'; const HOT_FG = '92400E'
const WARM_BG = 'EFF6FF'; const WARM_FG = '1E40AF'
const COLD_BG = 'F1F5F9'; const COLD_FG = '475569'

function scoreColors(s) {
  const sl = (s || '').toLowerCase()
  if (sl === 'hot') return { bg: HOT_BG, fg: HOT_FG }
  if (sl === 'warm') return { bg: WARM_BG, fg: WARM_FG }
  return { bg: COLD_BG, fg: COLD_FG }
}

function cell(children, opts = {}) {
  return new TableCell({
    children: Array.isArray(children) ? children : [children],
    width: opts.width ? { size: opts.width, type: WidthType.DXA } : undefined,
    shading: opts.fill ? { fill: opts.fill, type: ShadingType.CLEAR } : undefined,
    margins: { top: 80, bottom: 80, left: 100, right: 100 },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: BORDER },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: BORDER },
      left: { style: BorderStyle.SINGLE, size: 1, color: BORDER },
      right: { style: BorderStyle.SINGLE, size: 1, color: BORDER },
    },
    verticalAlign: 'center',
    ...opts,
  })
}

function para(text, opts = {}) {
  return new Paragraph({
    children: [new TextRun({
      text: String(text || ''),
      font: 'Arial',
      size: opts.size || 18,
      bold: opts.bold || false,
      color: opts.color || DARK,
      ...opts.run,
    })],
    spacing: { before: opts.before || 0, after: opts.after || 60 },
    alignment: opts.align || AlignmentType.LEFT,
    ...opts.para,
  })
}

export async function POST(req) {
  try {
    const { type, agentName, date, summary, narrative, scores, enriched } = await req.json()

    if (type === 'word') {
      return await buildWord({ agentName, date, summary, narrative, scores })
    }

    return Response.json({ error: 'Unknown export type' }, { status: 400 })
  } catch (err) {
    console.error('Export error:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}

async function buildWord({ agentName, date, summary, narrative, scores }) {
  const hot = scores?.filter(s => s.score?.toLowerCase() === 'hot').length || 0
  const warm = scores?.filter(s => s.score?.toLowerCase() === 'warm').length || 0
  const cold = scores?.filter(s => s.score?.toLowerCase() === 'cold').length || 0
  const total = scores?.length || 0

  // Page content width: A4 with 1" margins = 11906 - 1440 - 1440 = 9026 DXA
  const CW = 9026

  const children = []

  // ── Brand header ──────────────────────────────────────────
  children.push(new Paragraph({
    children: [
      new TextRun({ text: 'KARTHI', bold: true, size: 36, color: NAVY, font: 'Arial' }),
      new TextRun({ text: 'KEY', bold: true, size: 36, color: BLUE, font: 'Arial' }),
      new TextRun({ text: '  AI Agent Platform', size: 22, color: GRAY, font: 'Arial' }),
    ],
    spacing: { before: 0, after: 80 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: BLUE, space: 1 } },
  }))

  // ── Agent name ────────────────────────────────────────────
  children.push(new Paragraph({
    children: [new TextRun({ text: agentName, bold: true, size: 32, color: NAVY, font: 'Arial' })],
    spacing: { before: 160, after: 80 },
  }))

  // ── Meta line ─────────────────────────────────────────────
  children.push(new Paragraph({
    children: [
      new TextRun({ text: `Generated: ${date}`, size: 18, color: GRAY, font: 'Arial' }),
      ...(total ? [new TextRun({ text: `   \u00b7   ${total} records  \u2014  ${hot} Hot  \u00b7  ${warm} Warm  \u00b7  ${cold} Cold`, size: 18, color: BLUE, bold: true, font: 'Arial' })] : []),
    ],
    spacing: { before: 0, after: 320 },
  }))

  // ── Score summary boxes ───────────────────────────────────
  if (total > 0) {
    const bw = Math.floor(CW / 4)
    const makeBox = (count, label, bg, fg) => cell(
      new Paragraph({
        children: [
          new TextRun({ text: String(count), bold: true, size: 40, color: fg, font: 'Arial' }),
          new TextRun({ text: `\n${label}`, size: 16, color: fg, font: 'Arial' }),
        ],
        alignment: AlignmentType.CENTER,
      }),
      { fill: bg, width: bw }
    )
    children.push(new Table({
      width: { size: CW, type: WidthType.DXA },
      columnWidths: [bw, bw, bw, CW - bw * 3],
      rows: [new TableRow({ children: [
        makeBox(hot, 'HOT', HOT_BG, HOT_FG),
        makeBox(warm, 'WARM', WARM_BG, WARM_FG),
        makeBox(cold, 'COLD', COLD_BG, COLD_FG),
        makeBox(total, 'TOTAL', 'F8FAFC', GRAY),
      ]})],
    }))
    children.push(new Paragraph({ text: '', spacing: { after: 240 } }))
  }

  // ── What this means for you ───────────────────────────────
  if (summary) {
    children.push(new Table({
      width: { size: CW, type: WidthType.DXA },
      columnWidths: [CW],
      rows: [
        new TableRow({ children: [cell(
          new Paragraph({
            children: [new TextRun({ text: '\u2605  WHAT THIS MEANS FOR YOU', bold: true, size: 18, color: BLUE, font: 'Arial' })],
            spacing: { before: 80, after: 60 },
          }),
          { fill: LTBLUE, width: CW }
        )]}),
        new TableRow({ children: [cell(
          new Paragraph({
            children: [new TextRun({ text: summary, size: 20, color: DARK, font: 'Arial' })],
            spacing: { before: 40, after: 100 },
          }),
          { fill: 'EFF6FF', width: CW }
        )]}),
      ],
    }))
    children.push(new Paragraph({ text: '', spacing: { after: 240 } }))
  }

  // ── Narrative text ────────────────────────────────────────
  if (narrative) {
    const lines = narrative.split('\n')
    for (const line of lines) {
      if (!line.trim()) { children.push(new Paragraph({ text: '', spacing: { after: 80 } })); continue }
      const isBold = /^(Pipeline|Immediate|Next Action|Summary|Priority|Hot Deals|Warm Deals|Cold Deals)/.test(line)
      const isBullet = line.startsWith('- ') || line.startsWith('\u2022 ')
      const isNum = /^\d+\./.test(line.trim())
      const clean = line.replace(/^[-\u2022]\s*/, '').replace(/\*\*/g, '').replace(/\*/g, '')
      if (isBold) {
        children.push(new Paragraph({
          children: [new TextRun({ text: clean, bold: true, size: 20, color: NAVY, font: 'Arial' })],
          spacing: { before: 160, after: 60 },
        }))
      } else if (isBullet) {
        children.push(new Paragraph({
          children: [new TextRun({ text: clean, size: 19, color: '374151', font: 'Arial' })],
          numbering: { reference: 'bullets', level: 0 },
          spacing: { after: 50 },
        }))
      } else if (isNum) {
        children.push(new Paragraph({
          children: [new TextRun({ text: clean, size: 19, color: '374151', font: 'Arial' })],
          numbering: { reference: 'numbers', level: 0 },
          spacing: { after: 50 },
        }))
      } else {
        children.push(new Paragraph({
          children: [new TextRun({ text: clean, size: 19, color: '374151', font: 'Arial' })],
          spacing: { after: 50 },
        }))
      }
    }
    children.push(new Paragraph({ text: '', spacing: { after: 240 } }))
  }

  // ── Results table ─────────────────────────────────────────
  if (scores?.length) {
    children.push(new Paragraph({
      children: [new TextRun({ text: 'AI Scored Results', bold: true, size: 24, color: NAVY, font: 'Arial' })],
      spacing: { before: 80, after: 120 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: LTBLUE, space: 1 } },
    }))

    const cw = [Math.floor(CW*0.26), Math.floor(CW*0.09), Math.floor(CW*0.37), CW - Math.floor(CW*0.26) - Math.floor(CW*0.09) - Math.floor(CW*0.37)]

    const hdr = (t) => cell(
      new Paragraph({ children: [new TextRun({ text: t, bold: true, size: 17, color: WHITE, font: 'Arial' })], alignment: AlignmentType.LEFT }),
      { fill: NAVY }
    )

    const tableRows = [
      new TableRow({
        children: [hdr('Record'), hdr('Score'), hdr('Reason'), hdr('Next Action')],
        tableHeader: true,
      }),
      ...scores.map((r, i) => {
        const sc = scoreColors(r.score)
        return new TableRow({ children: [
          cell(new Paragraph({ children: [new TextRun({ text: r.name || '', bold: true, size: 17, color: DARK, font: 'Arial' })] }), { fill: i%2===0?WHITE:'F9FAFB' }),
          cell(new Paragraph({ children: [new TextRun({ text: (r.score||'').toUpperCase(), bold: true, size: 16, color: sc.fg, font: 'Arial' })], alignment: AlignmentType.CENTER }), { fill: sc.bg }),
          cell(new Paragraph({ children: [new TextRun({ text: r.reason || '', size: 16, color: '374151', font: 'Arial' })] }), { fill: i%2===0?WHITE:'F9FAFB' }),
          cell(new Paragraph({ children: [new TextRun({ text: r.action || '', size: 16, color: BLUE, font: 'Arial' })] }), { fill: i%2===0?WHITE:'F9FAFB' }),
        ]})
      })
    ]

    children.push(new Table({
      width: { size: CW, type: WidthType.DXA },
      columnWidths: cw,
      rows: tableRows,
    }))
  }

  // ── Footer line ───────────────────────────────────────────
  children.push(new Paragraph({ text: '', spacing: { before: 640 } }))
  children.push(new Paragraph({
    children: [new TextRun({ text: 'Karthikey AI  \u00b7  agents.karthikey.in  \u00b7  Confidential', size: 16, color: '94A3B8', font: 'Arial' })],
    alignment: AlignmentType.CENTER,
    border: { top: { style: BorderStyle.SINGLE, size: 4, color: BORDER, space: 4 } },
  }))

  const doc = new Document({
    numbering: {
      config: [
        { reference: 'bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '\u2022', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 480, hanging: 240 } } } }] },
        { reference: 'numbers', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 480, hanging: 240 } } } }] },
      ]
    },
    styles: {
      default: { document: { run: { font: 'Arial', size: 19 } } },
    },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 },
        }
      },
      children,
    }]
  })

  const buffer = await Packer.toBuffer(doc)
  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="karthikey-${agentName.replace(/\s+/g,'-').toLowerCase()}-${date.replace(/\s+/g,'-')}.docx"`,
    }
  })
}

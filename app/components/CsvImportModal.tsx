'use client'
import { useState, useRef } from 'react'
import Papa from 'papaparse'

interface Props {
  onClose: () => void
  onSuccess: () => void
}

interface CsvRow {
  company_name: string
  linkedin_url?: string
  contact_status?: string
  notes?: string
  contact_name?: string
  contact_email?: string
  contact_linkedin_url?: string
  contact_lang?: string
  [key: string]: string | undefined
}

export default function CsvImportModal({ onClose, onSuccess }: Props) {
  const [rows, setRows] = useState<CsvRow[]>([])
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => setRows(res.data),
    })
  }

  const handleImport = async () => {
    setImporting(true)
    const res = await fetch('/api/companies/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows }),
    })
    const data = await res.json()
    setResult(data)
    setImporting(false)
    if (data.imported > 0) onSuccess()
  }

  const preview = rows.slice(0, 5)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Import CSV</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        {!result && (
          <>
            <div className="mb-4">
              <p className="text-xs text-gray-500 mb-2">
                Required column: <code className="bg-gray-100 px-1 rounded">company_name</code>. Optional: linkedin_url, contact_status, notes, contact_name, contact_email, contact_linkedin_url, contact_lang
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                onChange={handleFile}
                className="block w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>

            {rows.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-gray-500 mb-2">{rows.length} rows loaded — preview (first 5):</p>
                <div className="overflow-x-auto border rounded">
                  <table className="text-xs min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {Object.keys(preview[0]).map(k => (
                          <th key={k} className="px-2 py-1.5 text-left text-gray-500 font-medium">{k}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {preview.map((row, i) => (
                        <tr key={i}>
                          {Object.values(row).map((v, j) => (
                            <td key={j} className="px-2 py-1.5 text-gray-700 max-w-[120px] truncate">{v}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <button onClick={onClose} className="px-4 py-2 border text-sm rounded hover:bg-gray-50">Cancel</button>
              <button
                onClick={handleImport}
                disabled={rows.length === 0 || importing}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {importing ? 'Importing...' : `Import ${rows.length} rows`}
              </button>
            </div>
          </>
        )}

        {result && (
          <div className="space-y-3">
            <p className="text-sm text-gray-700">
              <span className="font-semibold text-green-700">{result.imported} companies imported</span>
              {result.skipped > 0 && <span className="ml-2 text-gray-500">{result.skipped} skipped (duplicates)</span>}
            </p>
            {result.errors.length > 0 && (
              <div className="bg-red-50 rounded p-3">
                <p className="text-xs font-medium text-red-700 mb-1">Errors:</p>
                <ul className="text-xs text-red-600 space-y-0.5">
                  {result.errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </div>
            )}
            <div className="flex justify-end">
              <button onClick={onClose} className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">Done</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

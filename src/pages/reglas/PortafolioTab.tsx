import PropiosTab from './PropiosTab'
import CompetenciaSkusTab from './CompetenciaSkusTab'
import { useUrlParam } from '../../lib/useUrlState'
import { FileDown } from 'lucide-react'
import { downloadTemplate } from '../../lib/downloadTemplate'

const SUB_TABS = ['propios', 'competencia'] as const
type SubTab = typeof SUB_TABS[number]

function PortafolioTab({ tenantId }: { tenantId: string }) {
  const [rawSub, setSubTab] = useUrlParam('sub', 'propios')
  const subTab: SubTab = (SUB_TABS as readonly string[]).includes(rawSub)
    ? (rawSub as SubTab)
    : 'propios'

  const handleDownload = () => {
    downloadTemplate(
      'portafolio.xlsx',
      'Portafolio',
      ['EAN', 'SKU', 'Producto', 'Marca', 'Categoría', 'PVP Sugerido', 'Costo Variable', 'Peso Profit Pool', 'IVA'],
      {
        'EAN': '7702001234567',
        'SKU': 'SKU-001',
        'Producto': 'Coca-Cola 350ml',
        'Marca': 'Coca-Cola',
        'Categoría': 'Gaseosas',
        'PVP Sugerido': 2500,
        'Costo Variable': 1400,
        'Peso Profit Pool': 30,
        'IVA': 19,
      },
    )
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
      <div className="flex gap-1 p-1 bg-p-surface rounded-lg w-fit">
        <button
          onClick={() => setSubTab('propios')}
          className={subTab === 'propios'
            ? 'px-3 py-1 text-sm rounded-md bg-white text-p-dark font-medium shadow-sm transition-all'
            : 'px-3 py-1 text-sm rounded-md text-p-gray hover:text-p-dark transition-all'}
        >
          Propios
        </button>
        <button
          onClick={() => setSubTab('competencia')}
          className={subTab === 'competencia'
            ? 'px-3 py-1 text-sm rounded-md bg-white text-p-dark font-medium shadow-sm transition-all'
            : 'px-3 py-1 text-sm rounded-md text-p-gray hover:text-p-dark transition-all'}
        >
          Competencia
        </button>
      </div>
        <button
          onClick={handleDownload}
          aria-label="Descargar plantilla de portafolio"
          className="btn-secondary text-xs flex items-center gap-1 py-1.5"
        >
          <FileDown size={13} aria-hidden /> Descargar plantilla
        </button>
      </div>

      {subTab === 'propios'     && <PropiosTab tenantId={tenantId} />}
      {subTab === 'competencia' && <CompetenciaSkusTab tenantId={tenantId} />}
    </div>
  )
}

export default PortafolioTab

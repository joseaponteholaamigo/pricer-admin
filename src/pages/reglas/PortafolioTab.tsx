import PropiosTab from './PropiosTab'
import CompetenciaSkusTab from './CompetenciaSkusTab'
import { useUrlParam } from '../../lib/useUrlState'

const SUB_TABS = ['propios', 'competencia'] as const
type SubTab = typeof SUB_TABS[number]

function PortafolioTab({ tenantId }: { tenantId: string }) {
  const [rawSub, setSubTab] = useUrlParam('sub', 'propios')
  const subTab: SubTab = (SUB_TABS as readonly string[]).includes(rawSub)
    ? (rawSub as SubTab)
    : 'propios'

  return (
    <div>
      <div className="flex gap-1 mb-5 p-1 bg-p-surface rounded-lg w-fit">
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

      {subTab === 'propios'     && <PropiosTab tenantId={tenantId} />}
      {subTab === 'competencia' && <CompetenciaSkusTab tenantId={tenantId} />}
    </div>
  )
}

export default PortafolioTab

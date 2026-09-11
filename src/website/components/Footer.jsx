import { MARKETING_FOOTER } from '../content/marketingContent'

export function Footer({ onNavHash }) {
  return (
    <footer id={MARKETING_FOOTER.id}>
      <div className="wrap">
        <div className="fnote">{MARKETING_FOOTER.note}</div>
        <div className="flinks">
          {MARKETING_FOOTER.links.map(link => {
            if (link.href) {
              return (
                <a key={link.label} href={link.href}>
                  {link.label}
                </a>
              )
            }
            return (
              <button key={link.label} type="button" onClick={() => onNavHash(link.hash)}>
                {link.label}
              </button>
            )
          })}
        </div>
      </div>
    </footer>
  )
}

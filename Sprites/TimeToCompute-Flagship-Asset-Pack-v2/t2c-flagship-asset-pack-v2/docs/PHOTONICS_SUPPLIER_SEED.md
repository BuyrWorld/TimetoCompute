# Photonics supplier seed — verify on ingestion

Reviewed: 2026-08-16.

These records are a sourced editorial seed for the Photonics explainer. They are not permission to imply that every company supplies every component or customer shown elsewhere on the site. Production data should retain source IDs, dates and last-verification fields.

| Company | Ticker | Suggested relationship | Concise role | Primary source |
| --- | --- | --- | --- | --- |
| AXT | NASDAQ: AXTI | Material supplier | Manufactures compound-semiconductor substrates, including indium-phosphide wafer substrates. | https://investors.axt.com/Investors/news/news-details/2026/AXT-Inc--Announces-Long-Term-Supplier-Agreement-with-Lumentum/default.aspx |
| Lumentum | NASDAQ: LITE | Direct manufacturer | Produces InP lasers and EML products used in high-speed optical connectivity. | https://www.lumentum.com/en/products/eml-200g-pam4-cwdm-laser |
| Coherent | NYSE: COHR | Direct manufacturer / technology enabler | Produces optical communication components, laser/photonic devices, transceivers and transceiver-enabling ICs. | https://www.coherent.com/news/press-releases/optical-transceivers-based-on-200g-vcsels |
| Applied Optoelectronics | NASDAQ: AAOI | Direct manufacturer | Produces data-centre optical transceivers and semiconductor-laser products. | https://investors.ao-inc.com/news-releases/news-release-details/aoi-receives-first-volume-order-16t-data-center-transceivers |
| Marvell | NASDAQ: MRVL | Technology enabler | Produces PAM4 optical DSPs that enable 1.6T and lower-speed optical transceiver modules. | https://www.marvell.com/products/pam-dsp.html |
| Corning | NYSE: GLW | Fibre/connectivity supplier | Produces optical fibre, cable, connectors and high-density data-centre connectivity. | https://www.corning.com/worldwide/en/about-us/news-events/news-releases/2025/03/corning-launches-GlassWorks-AI-solutions-a-one-stop-shop-for-AI-data-center-infrastructure-needs.html |
| Fabrinet | NYSE: FN | Contract manufacturer | Provides advanced optical packaging and precision manufacturing services for optical components, modules and subsystems. | https://investor.fabrinet.com/news-releases/news-release-details/fabrinet-announces-fourth-quarter-and-fiscal-year-2025-financial |

## UI rules

- Display the relationship label beside the role.
- Allow one company to have multiple component-specific relationships.
- Do not show a green `confirmed` badge without relationship-specific evidence.
- A market quote is fetched separately and never stored in this editorial seed.
- Show exchange, currency, live/delayed/stale state and quote timestamp.
- Keep the explainer usable if quotes are unavailable.


/**
 * Annual reports read for the supply-chain map (October 2026).
 *
 * One record per company: its latest 10-K or 20-F on SEC EDGAR. Each is the
 * company describing itself and, where it chooses to, naming its suppliers
 * and customers. Registered in data/sources.js like every other document.
 */
const AR = (id, o) => ({
  id, sourceType: 'sec-filing', isPrimary: true, accessedAt: '2026-10-25', effectiveAt: o.publishedAt, ...o
});

export const ANNUAL_REPORTS = [
  AR('ar-amat', {
    title: 'Applied Materials annual report (Form 10-K)',
    url: 'https://www.sec.gov/Archives/edgar/data/6951/000162828025056742/amat-20251026.htm',
    publisher: 'Applied Materials (SEC EDGAR)', publishedAt: '2025-12-12'
  }),
  AR('ar-amd', {
    title: 'AMD annual report (Form 10-K)',
    url: 'https://www.sec.gov/Archives/edgar/data/2488/000000248826000018/amd-20251227.htm',
    publisher: 'AMD (SEC EDGAR)', publishedAt: '2026-02-04'
  }),
  AR('ar-amkr', {
    title: 'Amkor Technology annual report (Form 10-K)',
    url: 'https://www.sec.gov/Archives/edgar/data/1047127/000104712726000014/amkr-20251231.htm',
    publisher: 'Amkor Technology (SEC EDGAR)', publishedAt: '2026-02-20'
  }),
  AR('ar-amzn', {
    title: 'Amazon annual report (Form 10-K)',
    url: 'https://www.sec.gov/Archives/edgar/data/1018724/000101872426000004/amzn-20251231.htm',
    publisher: 'Amazon (SEC EDGAR)', publishedAt: '2026-02-06'
  }),
  AR('ar-asml', {
    title: 'ASML annual report (Form 20-F)',
    url: 'https://www.sec.gov/Archives/edgar/data/937966/000162828026011378/asml-20251231.htm',
    publisher: 'ASML (SEC EDGAR)', publishedAt: '2026-02-25'
  }),
  AR('ar-avgo', {
    title: 'Broadcom annual report (Form 10-K)',
    url: 'https://www.sec.gov/Archives/edgar/data/1730168/000173016825000121/avgo-20251102.htm',
    publisher: 'Broadcom (SEC EDGAR)', publishedAt: '2025-12-18'
  }),
  AR('ar-axti', {
    title: 'AXT annual report (Form 10-K)',
    url: 'https://www.sec.gov/Archives/edgar/data/1051627/000143774926008612/axti20251231_10k.htm',
    publisher: 'AXT (SEC EDGAR)', publishedAt: '2026-03-17'
  }),
  AR('ar-be', {
    title: 'Bloom Energy annual report (Form 10-K)',
    url: 'https://www.sec.gov/Archives/edgar/data/1664703/000162828026006516/be-20251231.htm',
    publisher: 'Bloom Energy (SEC EDGAR)', publishedAt: '2026-02-09'
  }),
  AR('ar-ceg', {
    title: 'Constellation Energy annual report (Form 10-K)',
    url: 'https://www.sec.gov/Archives/edgar/data/1868275/000186827526000032/ceg-20251231.htm',
    publisher: 'Constellation Energy (SEC EDGAR)', publishedAt: '2026-02-24'
  }),
  AR('ar-cohr', {
    title: 'Coherent annual report (Form 10-K)',
    url: 'https://www.sec.gov/Archives/edgar/data/820318/000082031826000020/iivi-20260630.htm',
    publisher: 'Coherent (SEC EDGAR)', publishedAt: '2026-08-14'
  }),
  AR('ar-crwv', {
    title: 'CoreWeave annual report (Form 10-K)',
    url: 'https://www.sec.gov/Archives/edgar/data/1769628/000176962826000104/crwv-20251231.htm',
    publisher: 'CoreWeave (SEC EDGAR)', publishedAt: '2026-03-02'
  }),
  AR('ar-dell', {
    title: 'Dell Technologies annual report (Form 10-K)',
    url: 'https://www.sec.gov/Archives/edgar/data/1571996/000157199626000008/dell-20260130.htm',
    publisher: 'Dell Technologies (SEC EDGAR)', publishedAt: '2026-03-16'
  }),
  AR('ar-eme', {
    title: 'EMCOR Group annual report (Form 10-K)',
    url: 'https://www.sec.gov/Archives/edgar/data/105634/000010563426000025/eme-20251231.htm',
    publisher: 'EMCOR Group (SEC EDGAR)', publishedAt: '2026-02-26'
  }),
  AR('ar-etn', {
    title: 'Eaton annual report (Form 10-K)',
    url: 'https://www.sec.gov/Archives/edgar/data/1551182/000155118226000007/etn-20251231.htm',
    publisher: 'Eaton (SEC EDGAR)', publishedAt: '2026-02-26'
  }),
  AR('ar-fcx', {
    title: 'Freeport-McMoRan annual report (Form 10-K)',
    url: 'https://www.sec.gov/Archives/edgar/data/831259/000083125926000012/fcx-20251231.htm',
    publisher: 'Freeport-McMoRan (SEC EDGAR)', publishedAt: '2026-02-13'
  }),
  AR('ar-fix', {
    title: 'Comfort Systems USA annual report (Form 10-K)',
    url: 'https://www.sec.gov/Archives/edgar/data/1035983/000110465926017530/fix-20251231x10k.htm',
    publisher: 'Comfort Systems USA (SEC EDGAR)', publishedAt: '2026-02-19'
  }),
  AR('ar-fn', {
    title: 'Fabrinet annual report (Form 10-K)',
    url: 'https://www.sec.gov/Archives/edgar/data/1408710/000140871026000028/fn-20260626.htm',
    publisher: 'Fabrinet (SEC EDGAR)', publishedAt: '2026-08-18'
  }),
  AR('ar-gev', {
    title: 'GE Vernova annual report (Form 10-K)',
    url: 'https://www.sec.gov/Archives/edgar/data/1996810/000199681026000015/gev-20251231.htm',
    publisher: 'GE Vernova (SEC EDGAR)', publishedAt: '2026-01-29'
  }),
  AR('ar-googl', {
    title: 'Alphabet annual report (Form 10-K)',
    url: 'https://www.sec.gov/Archives/edgar/data/1652044/000165204426000018/goog-20251231.htm',
    publisher: 'Alphabet (SEC EDGAR)', publishedAt: '2026-02-05'
  }),
  AR('ar-lite', {
    title: 'Lumentum annual report (Form 10-K)',
    url: 'https://www.sec.gov/Archives/edgar/data/1633978/000162828026057358/lite-20260627.htm',
    publisher: 'Lumentum (SEC EDGAR)', publishedAt: '2026-08-17'
  }),
  AR('ar-meta', {
    title: 'Meta Platforms annual report (Form 10-K)',
    url: 'https://www.sec.gov/Archives/edgar/data/1326801/000162828026003942/meta-20251231.htm',
    publisher: 'Meta Platforms (SEC EDGAR)', publishedAt: '2026-01-29'
  }),
  AR('ar-mod', {
    title: 'Modine Manufacturing annual report (Form 10-K)',
    url: 'https://www.sec.gov/Archives/edgar/data/67347/000110465926066795/mod-20260331x10k.htm',
    publisher: 'Modine Manufacturing (SEC EDGAR)', publishedAt: '2026-05-27'
  }),
  AR('ar-mp', {
    title: 'MP Materials annual report (Form 10-K)',
    url: 'https://www.sec.gov/Archives/edgar/data/1801368/000180136826000008/mp-20251231.htm',
    publisher: 'MP Materials (SEC EDGAR)', publishedAt: '2026-02-26'
  }),
  AR('ar-mrvl', {
    title: 'Marvell Technology annual report (Form 10-K)',
    url: 'https://www.sec.gov/Archives/edgar/data/1835632/000183563226000011/mrvl-20260131.htm',
    publisher: 'Marvell Technology (SEC EDGAR)', publishedAt: '2026-03-11'
  }),
  AR('ar-msft', {
    title: 'Microsoft annual report (Form 10-K)',
    url: 'https://www.sec.gov/Archives/edgar/data/789019/000119312526323660/msft-20260630.htm',
    publisher: 'Microsoft (SEC EDGAR)', publishedAt: '2026-07-29'
  }),
  AR('ar-mu', {
    title: 'Micron Technology annual report (Form 10-K)',
    url: 'https://www.sec.gov/Archives/edgar/data/723125/000072312526000023/mu-20260903.htm',
    publisher: 'Micron Technology (SEC EDGAR)', publishedAt: '2026-10-09'
  }),
  AR('ar-nbis', {
    title: 'Nebius Group annual report (Form 20-F)',
    url: 'https://www.sec.gov/Archives/edgar/data/1513845/000110465926052948/nbis-20251231x20f.htm',
    publisher: 'Nebius Group (SEC EDGAR)', publishedAt: '2026-04-30'
  }),
  AR('ar-nvda', {
    title: 'NVIDIA annual report (Form 10-K)',
    url: 'https://www.sec.gov/Archives/edgar/data/1045810/000104581026000021/nvda-20260125.htm',
    publisher: 'NVIDIA (SEC EDGAR)', publishedAt: '2026-02-25'
  }),
  AR('ar-nvt', {
    title: 'nVent Electric annual report (Form 10-K)',
    url: 'https://www.sec.gov/Archives/edgar/data/1720635/000162828026008608/nvt-20251231.htm',
    publisher: 'nVent Electric (SEC EDGAR)', publishedAt: '2026-02-17'
  }),
  AR('ar-pwr', {
    title: 'Quanta Services annual report (Form 10-K)',
    url: 'https://www.sec.gov/Archives/edgar/data/1050915/000105091526000006/pwr-20251231.htm',
    publisher: 'Quanta Services (SEC EDGAR)', publishedAt: '2026-02-19'
  }),
  AR('ar-smci', {
    title: 'Super Micro Computer annual report (Form 10-K)',
    url: 'https://www.sec.gov/Archives/edgar/data/1375365/000137536526000022/smci-20260630.htm',
    publisher: 'Super Micro Computer (SEC EDGAR)', publishedAt: '2026-08-31'
  }),
  AR('ar-tsm', {
    title: 'TSMC annual report (Form 20-F)',
    url: 'https://www.sec.gov/Archives/edgar/data/1046179/000162828026025362/tsm-20251231.htm',
    publisher: 'TSMC (SEC EDGAR)', publishedAt: '2026-04-16'
  }),
  AR('ar-vrt', {
    title: 'Vertiv annual report (Form 10-K)',
    url: 'https://www.sec.gov/Archives/edgar/data/1674101/000167410126000008/vrt-20251231.htm',
    publisher: 'Vertiv (SEC EDGAR)', publishedAt: '2026-02-13'
  }),
  AR('ar-wulf', {
    title: 'TeraWulf annual report (Form 10-K)',
    url: 'https://www.sec.gov/Archives/edgar/data/1083301/000108330126000031/wulf-20251231.htm',
    publisher: 'TeraWulf (SEC EDGAR)', publishedAt: '2026-02-27'
  }),
];

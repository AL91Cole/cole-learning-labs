// Lab computer settings that the enterprise policies cannot set (the policies
// only accept some preference names). Read by Firefox ESR at every start.
//
// Web pages share the few content processes of dom.ipc.processCount instead of
// one process for every site. Each process has about 20 threads, and threads
// count toward the machine's process limit (512): with one process per site,
// about 15 different sites at once (or fewer pages that embed other sites) used
// up the limit, so tabs crashed and nothing new could start. Sites a learner
// signs in to, and sites that ask for isolation (Cross-Origin-Opener-Policy),
// still get a process of their own.
pref("fission.webContentIsolationStrategy", 2, locked);

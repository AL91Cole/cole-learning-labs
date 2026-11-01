# Free and member learning access

The approved free offer includes fifteen K–6 activities, all five older beginner courses, the practice workbench and two older investigation labs per topic. The older investigation samples use the first two existing cases in each topic:

| Topic | Free cases |
| --- | --- |
| Hardware | INC-101, INC-102 |
| Networking and operating systems | NET-201, NET-202 |
| AI | AI-301, AI-302 |
| Cybersecurity | SEC-401, SEC-402 |
| Coding | CODE-501, CODE-502 |

That is ten free investigations and 32 member investigations in the 42-case catalogue. The five beginner courses remain free and each currently hands off to a free investigation. Practice workbenches for free networking, AI and cybersecurity cases remain public; their member-case variants require member access. Hardware practice is available within the free hardware activities.

The separate `#explore` catalogue contains fifteen free activities: five topics in each of the K–1, 2–3 and 4–6 bands. Exact `#explore/EX-...` IDs are allowlisted; unknown IDs, extra route components and unsupported bands stay closed. Elementary choices belong only to the mounted activity and reset on leaving. These pages mount no text-entry, device-saving, report, classroom, improvement-sharing or cloud-AI control. They do not relabel the existing grades 7–12 courses or change the older ten-case free allowlist. Hosting and browser/OS metadata processing still exist; this is not a universal anonymity or school-approval claim.

Both freeform studios, every open coding sandbox, the capstone sequence and educator learning resources are member content. Portfolio, contact, privacy, accessibility information and the introductory student guide remain public. Information about a member activity can be public without delivering that activity.

`src/lab-catalog.js` contains only a literal, frozen list of public catalogue fields: ID, title, topic, grade, duration and free/member status. It imports no authored scenario module and excludes briefs, clues, answers, fixtures, code starters and lesson instructions. `src/access-policy.js` imports only that metadata, defines the explicit free IDs and classifies parsed routes. Unknown IDs and routes stay closed. A route query, browser storage or caller-supplied membership claim cannot change its classification.

`MEMBER_CONTENT` defaults to `false`. The compiler forces the public context false and the separately protected member context true. This constant classifies the delivered application; it is not authentication. `scripts/tier-bundles.mjs` strips paid case payloads, fixtures, templates and feature modules from the public bundle. `scripts/build.mjs` publishes only the compiled free application, local privacy tool and reviewed static assets; raw scenario/feature modules and curriculum downloads are excluded. The preview serves this compiled artifact rather than the source checkout. Workbench selectors receive only the free cases. Legacy curriculum/classroom URLs redirect to membership information.

The member compiler preserves the full app. `memberships/build.mjs` embeds its reviewed bytes only into the server Worker; the public portal binding contains three preview files. The Worker checks current adult authentication and fresh paid entitlement for every `/learn/` asset, using no static fallback or cached paid decision. All production activation gates remain false, so this protected application cannot currently be used or purchased.

Public work uses the separate optional device-saving key `cole-learning-labs:public:v1`. It does not read or overwrite earlier full-catalogue drafts stored under `cole-learning-labs:v2`. No automatic migration, upload or deletion occurs; the explicit clear-local-work choice removes both scopes. Earlier work needs a separately reviewed local export/migration route if users require it after launch.

Existing source and earlier versions of this public repository have already been public. Access restrictions on the hosted service do not retroactively make that source confidential.

Student collection, classroom services, live billing and prices remain independently disabled pending their separate reviews. Membership authentication and billing are for approved adult purchasers; this access policy does not authorize student accounts or collection. A member release still requires server-verified current paid access and the existing membership release approvals. The separately prepared [private owner entitlement](OWNER-LAB-ACCESS.md) can grant the owner content access without payment only after exact server-verified identity checks; it does not enable public memberships, lift usage budgets or unlock classroom processing.

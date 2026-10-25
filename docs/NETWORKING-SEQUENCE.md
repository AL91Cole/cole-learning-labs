# Networking investigations

These ten original activities draw on the supplied **ISSC231: Networking Concepts** syllabus (dated February 14, 2023, outline on pages 2-7) and the public lab topics for Michael G. Solomon's **Fundamentals of Communications and Networking with Cloud Labs, Third Edition**. The syllabus supplies course objectives and assignments; the book's lab list supplies the sequence below. Cole Learning Labs uses original classroom situations, fixed local models and the plain wording already used in its labs. These activities cover selected topics and do not claim full course equivalence.

Start with **Follow a network connection** (`#learn/network`). Then use the ordered networking list in the lab catalog. Each investigation keeps the existing three sections: **Request & clues**, **Workbench & test**, and **Check & explain**. Students ask a question, collect two clues, save separate symptom and hypothesis notes, apply a plan, inspect readings, run a current test and explain the result. Existing section gates also apply to the new labs.

| Order | Investigation | Reference topics | What students practice |
| --- | --- | --- | --- |
| 1 | `NET-208` | Lab 1: physical and logical infrastructure; syllabus LAN design, Ethernet and media | Compare the room layout and connection plan; choose a switch, topology and links. |
| 2 | `NET-215` | Lab 2: data link and network layer traffic with Wireshark; syllabus OSI, TCP/IP and addressing | Read supplied packet evidence, follow MAC and IP addresses, and explain a delivery problem. |
| 3 | `NET-207` | Lab 3: transport and application layer traffic with Wireshark; syllabus communications and protocols | Follow a classroom message through supplied packet evidence and choose protocols for the task. |
| 4 | `NET-210` | Lab 4: Layer 2 and Spanning Tree Protocol; syllabus VLANs and resiliency | Separate guest and staff traffic, carry needed VLANs and keep loop protection. |
| 5 | `NET-209` | Lab 5: Layer 3 and dynamic routing; syllabus subnetting, NAT and routing | Choose a valid host and gateway, then compare paths in a fixed OSPF model. |
| 6 | `NET-214` | Lab 6: topology design with GNS3; syllabus network design, wireless and asset management | Plan capacity, wireless access and segmentation, then record a handoff plan. |
| 7 | `NET-216` | Lab 7: SNMP manager and alerts; syllabus network management and monitoring | Choose a manager and alert settings, then use supplied readings to check which event needs attention. |
| 8 | `NET-213` | Lab 8: monitoring, performance assessment and auditing; syllabus optimization, troubleshooting and voice | Read call-quality and activity evidence, separate signaling from media and test a traffic plan. |
| 9 | `NET-211` | Lab 9: layered security; syllabus authentication, filtering, firewalls and detection | Keep the learning portal available while limiting unnecessary access. |
| 10 | `NET-212` | Lab 10: common network troubleshooting; syllabus WANs and troubleshooting tools | Compare local and remote readings to locate a broken path. |

For direct practice, open a **networking practice workbench** from the catalog and choose a case. This practice state stays separate from a guided investigation and does not earn its completion.

The order is a teaching recommendation. Teachers can still assign an individual investigation. Grade bands are starting points for choosing support, not evidence of a learner's readiness.

## See the network change

The ten sequence labs include a device-and-connection diagram in Workbench & test. Drag a device to move it, or use its arrow buttons. Select matching cable ports to connect them, select a cable to disconnect it, or use the labelled Connect and Disconnect buttons. Device settings remain available for addresses, VLANs and other choices. Unplugging a required cable changes connectivity and requires a fresh test; moving a device keeps its network settings and test result. Link labels distinguish a ready path, a blocked path, and a standby link. The packet-reading labs keep the supplied trace fixed and show whether the saved annotations match it.

The picture shows the current saved plan and supplied observations. It does not replace a fresh workspace test or the student's explanation. Inspecting a device keeps unapplied form choices and notebook drafts in place. On smaller screens, the diagram has its own keyboard-accessible scroll area. Connection details also provide a text view.

## Supporting practice

The original six cases keep their IDs and saved-state meanings: `NET-201` addressing and DNS, `NET-202` approved sharing, `NET-203` startup and service recovery, `NET-204` wireless coverage and channel selection, `NET-205` printing, and `NET-206` backup integrity. Use `NET-204` for extra wireless evidence and `NET-206` alongside the Week 6 recovery discussion.

The activities use fixed fictional devices, addresses and tool output. Applying a choice changes the local model; it does not configure equipment or run a real command. The packet activities supply authored evidence inspired by Wireshark learning objectives. The topology activity uses planning choices inspired by the GNS3 topic. Neither tool runs inside these labs, and no cloud lab account is required. Inspection alone does not establish completion. A changed plan needs a fresh test, and students must still explain their evidence.

This sequence introduces selected concepts through original browser-based teaching simulations. It does not reproduce the textbook's proprietary lab procedures or provide its cloud runtime. It does not replace hands-on work with real switching hardware, full router configuration, wireless standards testing, packet capture, an actual VoIP system, or a complete network-management course. The existing printable workbook and quiz downloads remain general companions; they have not been revised into a ten-part networking workbook. Teacher rubrics and answer keys remain outside the public labs.

## Technical references

The publisher's [Fundamentals of Communications and Networking, Third Edition](https://www.jblearning.com/catalog/productdetails/9781284206654) lists the ten lab topics used for this order. The user-supplied list describes Lab 8 as monitoring and auditing; the publisher describes monitoring and assessing performance. This sequence includes both activity evidence and performance readings. The supplied syllabus remains a local reference and is not included in the public site.

The models use selected concepts from [RTP (RFC 3550)](https://www.rfc-editor.org/info/rfc3550/), [SIP (RFC 3261)](https://www.rfc-editor.org/rfc/rfc3261), [Cisco spanning tree guidance](https://www.cisco.com/c/en/us/support/docs/lan-switching/spanning-tree-protocol/10586-65.html), and [ITU-T network-management terminology](https://www.itu.int/epublications/en/publication/itu-t-g-7702-2022-amd-1-2024-08). FCAPS uses Accounting for its A; device inventory is also practiced as a separate management task.

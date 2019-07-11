# Playbook Viewer

Over the past few years, we’ve been tossing around the idea of an “Adversary Playbook.” The idea is rather straightforward: just as we create offensive and defensive playbooks for sports, our adversaries also have offensive playbooks that they execute to compromise organizations. They may not write them down, but they exist. Through observation and data sharing, defenders can create their own version of the Adversary's playbook, and then use that playbook to better defend their network with defensive playbooks. 

The goal of the Playbook is to organize the tools, techniques, and procedures that an adversary uses into a structured format, which can be shared with others, and built upon. To achieve this goal, we didn’t want to develop a proprietary structure that would be exclusive to Palo Alto Networks. Instead, we identified two frameworks that would enable us to not only structure our data, but also enable us to share it with others.

|Framework	|Description|
|----------|-------------|
|STIX 2.0|Structured Threat Information Expression (STIX™) is a language and serialization format used to exchange cyber threat intelligence (CTI).|
|ATT&CK|MITRE’s Adversarial Tactics, Techniques, and Common Knowledge (ATT&CK™) is a curated knowledge base and model for cyber adversary behavior, reflecting the various phases of an adversary’s lifecycle and the platforms they are known to target. ATT&CK is useful for understanding security risk against known adversary behavior, for planning security improvements, and verifying defenses work as expected.|

STIX 2.0 is the latest iteration of the STIX format. It has been re-designed to simplify the creation of documents and uses JSON rather than XML. STIX 2.0 provides a list of objects to represent types of information typically generated for cyber threat intelligence (CTI). For instance, STIX includes objects for intrusion sets, malware, and indicators, among others. STIX standardizes the information and attributes stored within objects based on the object type, as well as the relationships available between the various object types. The standardized objects and their relationships between each other allows this intelligence to be sharable and easily consumable without having to write complicated parsing tools.

MITRE’s ATT&CK framework provide names, descriptions, and links to examples of the high-level tactics adversaries’ use during an operation, as well as the techniques the adversary uses to achieve them. For example, the ATT&CK framework has a tactic called ‘Launch’ that refers to an adversary attempting to penetrate a network. One technique associated with this tactic is called “Spear phishing messages with malicious attachments”, which describes how the adversary would launch an attack on the network. This provides common definitions and understandings of how a specific goal is accomplished by attackers. 



To meld these frameworks together, we looked at how Mitre mapped their ATT&CK data to STIX 2.0 and then chose appropriate objects for additional Playbook components.  

|STIX 2.0 Object	|Playbook Component|
|----------|-------------|
|Intrusion Set |	Adversary|
|Report|	Playbook|
|Report|	Play|
|Campaign|	Campaign|
|Kill-Chain-Phase |	ATT&CK Tactic|
|Attack-Pattern|	ATT&CK Technique|
|Indicator|	Indicator|
|Malware|	Adversary Malware|
|Tool	|Adversary Tool|

If you want to try this tool out, view it here: https://pan-unit42.github.io/playbook_viewer/

If you want to link directly to a Playbook, you can do so by appending `?pb=playbook_name` to the URL.

For example, Oilrig is oilrig.json, and the direct link is: https://pan-unit42.github.io/playbook_viewer/?pb=oilrig

# Playbook Structure

The structure of a Playbook is described in detail [here](./docs/Playbook%20Structure.md).
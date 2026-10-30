# User roles

This document records the audiences the NYC Data Atlas should support as its
analysis features grow. These are user profiles: they describe people's context,
questions, and likely needs. They do not define accounts, permissions, or access
to data. The current site presents public data without role-specific access.

Role names are working labels. A person may fit more than one profile, and the
profiles should guide product decisions without assuming that everyone in a
role has the same responsibilities or expertise.

## Analyst

**Context:** Works with city data to investigate patterns, check claims, and
prepare findings for colleagues or the public. May be a researcher, journalist,
agency analyst, or community data practitioner.

**Questions:**

- What changed, where, and over what period?
- How do neighborhoods, boroughs, or operational areas compare?
- Which source, definition, and calculation produced this figure?
- Can I reproduce the result or take it into another analysis?

**Product needs:** Clear metric definitions and units; source and method notes;
usable filters for geography and time; comparisons and trends; visible coverage
gaps and estimates; and a reliable way to save or export a view or its data.

## Battalion Chief

**Context:** Leads or coordinates fire and emergency response activity at the
battalion level. Needs information that can help understand conditions across
the area and communicate them to crews and command staff.

**Questions:**

- What patterns are visible in my battalion, and how do they compare with nearby
  battalions or the borough?
- Where are incidents or response concerns concentrated?
- How current and complete is the information, and what does it leave out?

**Product needs:** Quick battalion-level views; relevant incident and facility
context; clear time ranges; comparisons that account for differences in area
size; and concise explanations that can be shared in operational discussions.

## Commissioner

**Context:** Senior agency leader responsible for citywide direction,
performance, and public accountability. Needs a broad view while retaining a
path to investigate local variation.

**Questions:**

- How is the system performing across the city and over time?
- Which boroughs or operational areas differ from the citywide pattern?
- What evidence supports a proposed priority or intervention?
- Where are the limits in the data?

**Product needs:** Citywide summaries; consistent comparisons across boroughs
and operating areas; trends and breakdowns; transparent caveats; and
presentation-ready views with source attribution.

## Borough Chief

**Context:** Coordinates department priorities and operations across a borough.
Needs to understand borough-wide patterns and how they vary among the areas
within it.

**Questions:**

- How does this borough compare with the rest of the city?
- Which battalions, precincts, or neighborhoods account for the variation?
- Are patterns changing, and which areas may need closer review?

**Product needs:** A borough-first view; drill-down into areas within the
borough; comparisons with citywide figures; and context about boundaries,
coverage, and data quality.

## Policy Maker

**Context:** Develops, evaluates, or oversees public policy. May work in
government, advocacy, community organizations, or a legislative office. Often
needs evidence that connects local conditions to a policy question.

**Questions:**

- Which communities experience different outcomes, and how large are those
  differences?
- Do patterns change after a policy or service change?
- What can this dataset support, and what conclusions would go beyond it?
- How do demographic and service measures relate spatially?

**Product needs:** Comparable measures with definitions; time context; source
transparency; appropriate geographic detail; accessible explanations of
uncertainty and correlation limits; and exports or citations for policy work.

## Public

**Context:** A resident, community member, student, or other curious visitor
looking to understand their city. May have no prior experience with data
analysis or agency geography.

**Questions:**

- What is happening in my area?
- How does it compare with the borough or city?
- What does this measure mean, and where did it come from?
- What should I keep in mind when interpreting it?

**Product needs:** Plain-language labels; approachable defaults; clear
geographic names; useful explanations of terms and caveats; mobile-friendly
interaction; and a simple way to share a finding.

## Shared principles

- Explain what each measure counts, its time period, and its geographic unit.
- Show sources, methods, coverage, and known limitations where people make
  comparisons or draw conclusions.
- Do not imply that an observed association proves a cause or that a small-area
  difference is meaningful without context.
- Make important information understandable without requiring specialist
  knowledge, while preserving enough detail for analysts to check the work.
- Treat these profiles as a guide to useful experiences, not as evidence of a
  person's identity or authority.

## Decisions for future role infrastructure

Before implementing role-aware behavior, define explicitly:

- whether roles are selectable personas, verified organizational roles, or both;
- whether roles change only the interface or also data access and actions;
- how users choose, change, and retain a role;
- which information or actions, if any, require authentication or authorization;
- how role-specific defaults coexist with accessible public explanations;
- how to test and maintain role behavior as the data and product change.

Until those decisions are made, role-specific needs should inform design and
analysis workflows without restricting public data access.

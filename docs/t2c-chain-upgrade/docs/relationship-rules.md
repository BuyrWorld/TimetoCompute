# Relationship rules

The Chain must not imply a commercial relationship merely because two entities occupy adjacent stages.

## Confidence types

### verified
A direct relationship confirmed by one or both companies, regulatory filing, contract announcement, investor materials, or another primary source.

### reported
A relationship reported by a reputable secondary source but not yet confirmed strongly enough to classify as verified.

### inferred
A plausible relationship inferred from architecture, supply-chain position, common hardware configurations or industry practice.

Do not draw inferred relationships as factual production edges by default.

### ecosystem
The entities participate in the same technical or commercial ecosystem, but no direct contract is being claimed.

## UI recommendation

- Verified: solid bright dependency edge.
- Reported: dashed or slightly subdued dependency edge.
- Inferred: hidden by default; may appear in an explicitly labelled research mode later.
- Ecosystem: do not represent as a supplier/customer edge.

## Sources

Every commercial infrastructure relationship should support:
- sourceUrl
- sourceLabel
- updatedAt

If a source cannot be retained, omit the edge rather than present it as fact.

## Parent/model relationships

Parent-model relationships such as OpenAI → GPT or Anthropic → Claude can be treated as verified structural relationships.

## Stage membership

An entity's inclusion in a stage is a classification, not a commercial claim.

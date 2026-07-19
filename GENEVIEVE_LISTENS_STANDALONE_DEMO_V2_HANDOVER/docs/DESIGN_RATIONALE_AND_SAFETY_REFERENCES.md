# Design rationale and safety references

This is a discussion and workflow prototype, not a clinical device, diagnosis, treatment service or emergency monitoring system.

## Structured, accountable handover

The Australian Commission on Safety and Quality in Health Care states that structured clinical handover should include relevant current information, the patient’s goals and preferences, involvement of the patient and support people according to the patient’s wishes, and explicit transfer of responsibility and accountability. V2 therefore creates an editable person-generated draft and links the design to the No Lost Referral workflow rather than treating export as completed care.

Reference: https://www.safetyandquality.gov.au/standards/nsqhs-standards/communicating-safety-standard/clinical-governance-and-quality-improvement-support-effective-communication

The Commission also describes effective documentation as accurate, timely, relevant, objective, readable and understandable by someone who was not present. V2 preserves timestamps, separates direct quotes from possible themes, and marks unknown periods instead of inventing transitions.

Reference: https://www.safetyandquality.gov.au/our-work/communicating-safety/clinical-handover/implementation-toolkit-clinical-handover-improvement

## Consent and minimum necessary information

Australian privacy guidance treats mental-health information as sensitive health information. Consent should be informed, voluntary, current and specific, and organisations should collect or disclose only the minimum information needed for the purpose. V2 therefore creates different summaries for different audiences, requires review and redaction, and records approval for one version and recipient.

References:
- https://www.oaic.gov.au/privacy/australian-privacy-principles/australian-privacy-principles-guidelines/chapter-b-key-concepts
- https://www.oaic.gov.au/privacy/your-privacy-rights/health-information/handling-health-information
- https://www.oaic.gov.au/privacy/australian-privacy-principles/australian-privacy-principles-guidelines/chapter-3-app-3-collection-of-solicited-personal-information

## Production requirements

A real deployment requires clinical governance, a privacy impact assessment, secure identity and access controls, encryption, retention and deletion rules, evaluated AI behaviour, adverse-event monitoring, clear emergency limitations, and verified acknowledgement by a receiving person or service.

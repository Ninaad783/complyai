"""
Enterprise Compliance PDF Generator for ComplyAI
Generates multi-page, realistic enterprise compliance PDFs for testing Document RAG,
semantic search, citations, and page-tracking.
"""
import os
from fpdf import FPDF


class CompliancePDF(FPDF):
    def __init__(self, doc_title: str, doc_code: str):
        super().__init__()
        self.doc_title = doc_title
        self.doc_code = doc_code

    def header(self):
        # Header banner
        self.set_font("Helvetica", "B", 8)
        self.set_text_color(100, 100, 120)
        self.cell(0, 6, f"COMPLYAI ENTERPRISE GOVERNANCE | {self.doc_code}", border=0, align="L")
        self.cell(0, 6, "CONFIDENTIAL & PROPRIETARY", border=0, align="R", new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(200, 200, 210)
        self.line(self.l_margin, self.get_y(), self.w - self.r_margin, self.get_y())
        self.ln(4)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(130, 130, 140)
        self.set_draw_color(220, 220, 230)
        self.line(self.l_margin, self.get_y(), self.w - self.r_margin, self.get_y())
        self.ln(2)
        self.cell(0, 10, f"{self.doc_title} | Version 3.2 (2025-2026)", align="L")
        self.cell(0, 10, f"Page {self.page_no()} of {{nb}}", align="R")


def build_soc2_pdf(out_path: str):
    pdf = CompliancePDF("SOC-2 Type II Information Security Policy", "POL-SEC-2025-01")
    pdf.set_auto_page_break(auto=True, margin=18)
    
    # ── PAGE 1 ──
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 18)
    pdf.set_text_color(20, 30, 70)
    pdf.cell(0, 12, "Enterprise Information Security & Access Policy", new_x="LMARGIN", new_y="NEXT")
    
    pdf.set_font("Helvetica", "I", 10)
    pdf.set_text_color(90, 90, 110)
    pdf.cell(0, 6, "SOC-2 Type II Trust Services Criteria & ISO/IEC 27001:2022 Alignment", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)

    pdf.set_font("Helvetica", "B", 12)
    pdf.set_text_color(40, 50, 90)
    pdf.cell(0, 8, "1. Executive Summary & Organizational Scope", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(50, 50, 60)
    pdf.multi_cell(0, 5.5, 
        "This policy governs all information assets, software environments, and physical devices owned, "
        "leased, or operated by ComplyAI Corporation. Compliance with this policy is mandatory for all full-time "
        "employees, contractors, vendors, and third-party affiliates with access to internal network infrastructure."
    )
    pdf.ln(3)

    pdf.set_font("Helvetica", "B", 12)
    pdf.set_text_color(40, 50, 90)
    pdf.cell(0, 8, "2. Governance Roles & Accountability", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(50, 50, 60)
    pdf.multi_cell(0, 5.5,
        "- Chief Information Security Officer (CISO): Responsible for annual policy reviews, external SOC-2 Type II audit management, and cyber risk governance.\n"
        "- Security Operations Center (SOC): Maintains 24/7 continuous log monitoring, SIEM alerting, and threat detection.\n"
        "- Department Heads: Ensure 100% of staff complete mandatory quarterly security awareness training within 14 calendar days of assignment."
    )
    pdf.ln(4)

    # Table of classifications
    pdf.set_font("Helvetica", "B", 10)
    pdf.set_fill_color(240, 242, 248)
    pdf.cell(50, 7, "Classification Level", border=1, fill=True)
    pdf.cell(70, 7, "Description", border=1, fill=True)
    pdf.cell(60, 7, "Protection Requirement", border=1, fill=True, new_x="LMARGIN", new_y="NEXT")

    pdf.set_font("Helvetica", "", 9)
    rows = [
        ("Restricted", "Customer PII, cryptographic keys, credentials", "AES-256 at rest, strict RBAC, MFA"),
        ("Confidential", "Financial statements, vendor contracts, source code", "Role-based authorization, encrypted storage"),
        ("Internal", "Org charts, internal wikis, project timelines", "SSO login required, company-internal only"),
        ("Public", "Marketing assets, public documentation", "No restriction, public read-only"),
    ]
    for col1, col2, col3 in rows:
        pdf.cell(50, 6.5, col1, border=1)
        pdf.cell(70, 6.5, col2, border=1)
        pdf.cell(60, 6.5, col3, border=1, new_x="LMARGIN", new_y="NEXT")

    # ── PAGE 2 ──
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 14)
    pdf.set_text_color(20, 30, 70)
    pdf.cell(0, 10, "3. Access Control & Password Management Standards", new_x="LMARGIN", new_y="NEXT")
    
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(50, 50, 60)
    pdf.multi_cell(0, 5.5,
        "Authentication into ComplyAI production environments, developer tools, and customer databases must satisfy "
        "the following cryptographic standards without exception:\n\n"
        "1. Password Length & Complexity: Passwords must contain a minimum of 14 characters, combining uppercase letters, "
        "lowercase letters, numbers, and at least one non-alphanumeric symbol (!@#$%^&*).\n"
        "2. Mandatory Password Expiration: Passwords must be rotated every 90 days. Systems must prohibit the reuse "
        "of the previous 12 historical passwords.\n"
        "3. Multi-Factor Authentication (MFA): MFA is mandatory across all accounts. Production cloud environments "
        "(AWS/GCP) strictly require FIDO2 / WebAuthn hardware security keys (e.g. YubiKey). SMS-based 2FA is prohibited.\n"
        "4. Account Lockout Threshold: Accounts are automatically locked after 5 consecutive failed login attempts. "
        "Unlocking requires IT Helpdesk identity verification.\n"
        "5. Session Timeouts: Corporate workstation screens and active browser sessions must automatically lock "
        "after 15 minutes of user inactivity."
    )
    pdf.ln(4)

    pdf.set_font("Helvetica", "B", 14)
    pdf.set_text_color(20, 30, 70)
    pdf.cell(0, 10, "4. Cryptographic Encryption Architecture", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(50, 50, 60)
    pdf.multi_cell(0, 5.5,
        "- Data at Rest: All production databases (PostgreSQL, SQLite), cloud storage buckets (AWS S3, GCS), and backup "
        "volumes must enforce AES-256-GCM encryption with automated KMS key rotation every 365 days.\n"
        "- Data in Transit: All external API communication and internal microservice mesh traffic must enforce "
        "TLS 1.3 protocol. TLS 1.0, 1.1, and unencrypted HTTP traffic are permanently rejected."
    )

    # ── PAGE 3 ──
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 14)
    pdf.set_text_color(20, 30, 70)
    pdf.cell(0, 10, "5. Incident Response Protocols & Severity SLAs", new_x="LMARGIN", new_y="NEXT")

    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(50, 50, 60)
    pdf.multi_cell(0, 5.5,
        "Security incidents must be escalated according to the following strict Service Level Agreements (SLAs):\n"
    )

    pdf.set_font("Helvetica", "B", 10)
    pdf.set_fill_color(240, 242, 248)
    pdf.cell(35, 7, "Severity Level", border=1, fill=True)
    pdf.cell(75, 7, "Example Event", border=1, fill=True)
    pdf.cell(35, 7, "Acknowledge SLA", border=1, fill=True)
    pdf.cell(35, 7, "Resolution SLA", border=1, fill=True, new_x="LMARGIN", new_y="NEXT")

    pdf.set_font("Helvetica", "", 9)
    incidents = [
        ("P1 - Critical", "Ransomware, active data breach, DB exfiltration", "15 minutes", "4 hours"),
        ("P2 - High", "Compromised employee account, DoS attack", "1 hour", "12 hours"),
        ("P3 - Medium", "Policy violation, unauthorized USB device plugged", "4 hours", "48 hours"),
        ("P4 - Low", "Spam email campaign, minor vulnerability patch", "24 hours", "5 business days"),
    ]
    for col1, col2, col3, col4 in incidents:
        pdf.cell(35, 6.5, col1, border=1)
        pdf.cell(75, 6.5, col2, border=1)
        pdf.cell(35, 6.5, col3, border=1)
        pdf.cell(35, 6.5, col4, border=1, new_x="LMARGIN", new_y="NEXT")
    pdf.ln(5)

    pdf.set_font("Helvetica", "B", 14)
    pdf.set_text_color(20, 30, 70)
    pdf.cell(0, 10, "6. Statutory Data Retention & Disposal Requirements", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(50, 50, 60)
    pdf.multi_cell(0, 5.5,
        "- Financial, Billing & Tax Records: Retained for a statutory period of 7 years in write-once-read-many (WORM) storage.\n"
        "- Security Audit Logs, Firewall Logs & Access Records: Retained for 3 years to support forensic investigations.\n"
        "- Customer Operational Data: Terminated customer records must be cryptographically sanitized or destroyed "
        "within 30 days of contract expiration."
    )
    pdf.output(out_path)


def build_vendor_dpa_pdf(out_path: str):
    pdf = CompliancePDF("Vendor Data Processing Agreement (DPA)", "AGR-DPA-2025-09")
    pdf.set_auto_page_break(auto=True, margin=18)

    # ── PAGE 1 ──
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 18)
    pdf.set_text_color(20, 30, 70)
    pdf.cell(0, 12, "Enterprise Data Processing Agreement (DPA)", new_x="LMARGIN", new_y="NEXT")

    pdf.set_font("Helvetica", "I", 10)
    pdf.set_text_color(90, 90, 110)
    pdf.cell(0, 6, "Standard Contractual Clauses under GDPR Article 28 and CCPA / CPRA", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)

    pdf.set_font("Helvetica", "B", 12)
    pdf.set_text_color(40, 50, 90)
    pdf.cell(0, 8, "1. Parties & Purpose of Processing", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(50, 50, 60)
    pdf.multi_cell(0, 5.5,
        "This Data Processing Agreement ('DPA') supplements the Master Services Agreement ('MSA') between "
        "ComplyAI Corp ('Data Controller') and the contracted Vendor ('Data Processor'). This agreement governs "
        "the processing of personal data, employee records, and business confidential intelligence in compliance "
        "with EU General Data Protection Regulation (GDPR) Regulation (EU) 2016/679 and California Consumer Privacy Act (CCPA)."
    )
    pdf.ln(3)

    pdf.set_font("Helvetica", "B", 12)
    pdf.set_text_color(40, 50, 90)
    pdf.cell(0, 8, "2. Vendor Security Commitments & Certifications", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(50, 50, 60)
    pdf.multi_cell(0, 5.5,
        "The Vendor certifies and warrants that it maintains technical and organizational measures (TOMs) appropriate "
        "to the risk of personal data processing, including:\n"
        "- Annual delivery of an unredacted SOC-2 Type II audit report conducted by an accredited CPA firm.\n"
        "- ISO/IEC 27001:2022 certified Information Security Management System (ISMS).\n"
        "- Annual third-party penetration testing reports with all High and Critical findings remediated within 30 days."
    )

    # ── PAGE 2 ──
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 14)
    pdf.set_text_color(20, 30, 70)
    pdf.cell(0, 10, "3. Subprocessor Appointment & Notification Clause", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(50, 50, 60)
    pdf.multi_cell(0, 5.5,
        "The Vendor shall not engage any new third-party subprocessor without adhering to the following contractual conditions:\n\n"
        "1. Advance Notification Window: The Vendor must provide at least 30 business days prior written notice "
        "to ComplyAI (via privacy@complyai.internal) before onboarding any new subprocessor or modifying data flows.\n"
        "2. Right of Objection: ComplyAI maintains the sole and uninhibited legal right to object to any proposed subprocessor "
        "on reasonable data protection or compliance grounds within 14 calendar days of receiving notice.\n"
        "3. Remedy & Termination: If the Vendor cannot resolve ComplyAI's objection within 30 calendar days, ComplyAI "
        "may terminate the underlying Master Services Agreement immediately without financial penalty or termination fee.\n"
        "4. Subprocessor Liability: The Vendor remains 100% fully liable to ComplyAI for the performance of its subprocessors."
    )
    pdf.ln(4)

    pdf.set_font("Helvetica", "B", 14)
    pdf.set_text_color(20, 30, 70)
    pdf.cell(0, 10, "4. Cross-Border Data Transfers", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(50, 50, 60)
    pdf.multi_cell(0, 5.5,
        "Any transfer of European Economic Area (EEA) personal data outside the European Union shall rely strictly upon "
        "the European Commission Standard Contractual Clauses (SCCs Module 2 - Controller to Processor) or the "
        "EU-U.S. Data Privacy Framework certification."
    )

    # ── PAGE 3 ──
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 14)
    pdf.set_text_color(20, 30, 70)
    pdf.cell(0, 10, "5. Security Breach Notification SLA", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(50, 50, 60)
    pdf.multi_cell(0, 5.5,
        "In the event of any confirmed or reasonably suspected Security Incident involving ComplyAI Customer Data:\n\n"
        "- Immediate 24-Hour Notice: Vendor must notify ComplyAI in writing within 24 hours of first becoming aware of the breach.\n"
        "- Forensic Details: Notice must contain the categories of records impacted, estimated number of data subjects, "
        "name of the Data Protection Officer leading response, and immediate mitigation actions taken.\n"
        "- Root Cause Post-Mortem: Vendor must deliver a complete forensic investigation report within 72 hours of incident containment."
    )
    pdf.ln(4)

    pdf.set_font("Helvetica", "B", 14)
    pdf.set_text_color(20, 30, 70)
    pdf.cell(0, 10, "6. Limitation of Liability & Regulatory Indemnification", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(50, 50, 60)
    pdf.multi_cell(0, 5.5,
        "- Standard Commercial Breaches: Capped at 1x the total fees paid by ComplyAI in the preceding 12 months.\n"
        "- Data Protection & Confidentiality Violations: Notwithstanding any limitation in the MSA, liability for data breaches, "
        "confidentiality failures, or willful GDPR violations shall be capped at 3x annual contract value or $5,000,000, "
        "whichever is greater.\n"
        "- Regulatory Fines: Vendor agrees to indemnify ComplyAI against any administrative fines levied by European Data "
        "Protection Authorities resulting directly from Vendor's breach of this DPA."
    )
    pdf.output(out_path)


def build_code_of_conduct_pdf(out_path: str):
    pdf = CompliancePDF("Corporate Code of Conduct & Ethics Charter", "POL-ETH-2025-03")
    pdf.set_auto_page_break(auto=True, margin=18)

    # ── PAGE 1 ──
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 18)
    pdf.set_text_color(20, 30, 70)
    pdf.cell(0, 12, "Corporate Code of Business Conduct & Ethics", new_x="LMARGIN", new_y="NEXT")

    pdf.set_font("Helvetica", "I", 10)
    pdf.set_text_color(90, 90, 110)
    pdf.cell(0, 6, "Applicable to Global Operations, Board Members, Officers & Employees", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)

    pdf.set_font("Helvetica", "B", 12)
    pdf.set_text_color(40, 50, 90)
    pdf.cell(0, 8, "1. Anti-Bribery, Corruption & FCPA Adherence", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(50, 50, 60)
    pdf.multi_cell(0, 5.5,
        "ComplyAI maintains zero tolerance for bribery, commercial kickbacks, or unlawful financial incentives in all "
        "jurisdictions where we conduct business, pursuant to the US Foreign Corrupt Practices Act (FCPA) and UK Bribery Act 2010.\n\n"
        "- Gift and Entertainment Limit: No employee may give or receive any gift, dining hospitality, or ticket exceeding "
        "$100 in cumulative value per calendar year without prior written consent from the Chief Compliance Officer.\n"
        "- Public Officials: Gifts, meals, travel accommodations, or gratuities of any nominal value to government officials "
        "or regulatory inspectors are strictly forbidden.\n"
        "- Facilitation Payments: Expedited processing payments ('grease payments') are strictly illegal and prohibited."
    )
    pdf.ln(4)

    pdf.set_font("Helvetica", "B", 12)
    pdf.set_text_color(40, 50, 90)
    pdf.cell(0, 8, "2. Conflicts of Interest & Secondary Employment", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(50, 50, 60)
    pdf.multi_cell(0, 5.5,
        "Employees must avoid any financial interest, consulting engagement, or familial relationship that conflicts "
        "with ComplyAI's best interests. All outside board advisory seats, secondary businesses, or equity stakes exceeding 1% "
        "in partner or supplier companies must be disclosed annually through the Compliance Disclosure Portal."
    )

    # ── PAGE 2 ──
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 14)
    pdf.set_text_color(20, 30, 70)
    pdf.cell(0, 10, "3. Insider Trading & Securities Market Protections", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(50, 50, 60)
    pdf.multi_cell(0, 5.5,
        "Personnel possessing Material Non-Public Information (MNPI) are strictly forbidden under federal securities laws "
        "from trading company shares or tipping third parties.\n\n"
        "- Quarterly Trading Blackout: Regular quarterly blackout windows begin two full weeks prior to the close of each "
        "fiscal quarter and terminate 48 hours following the public release of financial earnings.\n"
        "- Pre-Clearance Requirement: All executive vice presidents and accounting personnel must submit trade requests "
        "to the General Counsel 5 business days prior to executing any equity transactions."
    )
    pdf.ln(4)

    pdf.set_font("Helvetica", "B", 14)
    pdf.set_text_color(20, 30, 70)
    pdf.cell(0, 10, "4. Whistleblower Protection & Anonymous Hotline", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(50, 50, 60)
    pdf.multi_cell(0, 5.5,
        "ComplyAI provides multiple confidential channels for reporting suspected financial impropriety, harassment, "
        "or compliance violations without fear of reprisal:\n\n"
        "- 24/7 Global Hotline: Accessible toll-free at +1-800-555-COMPLY (2667).\n"
        "- Anonymous Web Portal: Accessible via encrypted portal at complyai-ethics.internal.\n"
        "- Strict Anti-Retaliation Guarantee: ComplyAI strictly prohibits any form of discipline, demotion, termination, "
        "or harassment against any whistleblower submitting a good-faith report. Any supervisor engaging in retaliation "
        "will face immediate termination of employment and possible civil or criminal liability."
    )
    pdf.output(out_path)


def build_hipaa_pdf(out_path: str):
    pdf = CompliancePDF("HIPAA Security & Health Data Privacy Policy", "POL-HIPAA-2025-05")
    pdf.set_auto_page_break(auto=True, margin=18)

    # ── PAGE 1 ──
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 18)
    pdf.set_text_color(20, 30, 70)
    pdf.cell(0, 12, "Health Insurance Portability & Accountability Act (HIPAA) Policy", new_x="LMARGIN", new_y="NEXT")

    pdf.set_font("Helvetica", "I", 10)
    pdf.set_text_color(90, 90, 110)
    pdf.cell(0, 6, "Security, Privacy & Breach Notification Rules for Electronic Protected Health Information (ePHI)", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)

    pdf.set_font("Helvetica", "B", 12)
    pdf.set_text_color(40, 50, 90)
    pdf.cell(0, 8, "1. Scope & Minimum Necessary Rule", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(50, 50, 60)
    pdf.multi_cell(0, 5.5,
        "This policy establishes mandatory operational protocols for storing, transmitting, and analyzing electronic "
        "Protected Health Information (ePHI) in full accordance with 45 CFR Part 160 and Part 164 Subparts A, C, and E.\n\n"
        "- Minimum Necessary Standard: Workforce members may only access or request the minimal amount of health information "
        "strictly necessary to fulfill authorized compliance audits or clinical evaluations.\n"
        "- Role-Based Access Control (RBAC): Access to ePHI requires explicit approval from the Privacy Officer and is revoked "
        "immediately upon role transfer or employee termination."
    )
    pdf.ln(4)

    pdf.set_font("Helvetica", "B", 12)
    pdf.set_text_color(40, 50, 90)
    pdf.cell(0, 8, "2. Business Associate Agreements (BAAs)", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(50, 50, 60)
    pdf.multi_cell(0, 5.5,
        "Prior to disclosing or transferring any ePHI to cloud service providers, IT contractors, or analytics sub-vendors, "
        "ComplyAI must execute a formal, legally binding Business Associate Agreement (BAA). "
        "Any vendor refusing to execute a BAA is barred from ingesting or accessing healthcare datasets."
    )

    # ── PAGE 2 ──
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 14)
    pdf.set_text_color(20, 30, 70)
    pdf.cell(0, 10, "3. Technical Safeguards & Encryption Standards", new_x="LMARGIN", new_y="NEXT")

    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(50, 50, 60)
    pdf.multi_cell(0, 5.5,
        "All systems managing ePHI must enforce the following cryptographic standards:\n\n"
        "1. Cryptographic Storage: All databases, object stores, and cold archives containing ePHI must enforce AES-256 "
        "encryption with HSM-managed master keys rotated every 180 days.\n"
        "2. Transmission Security: End-to-end TLS 1.3 encryption is mandatory for all inbound and outbound ePHI communications.\n"
        "3. Automatic Screen Inactivity Logoff: Workstations accessing healthcare portals must automatically terminate "
        "active sessions after 10 minutes of inactivity.\n"
        "4. Audit Logging & Tracking: All read, write, update, and export events involving ePHI are immutably logged "
        "and retained for a minimum of 6 years pursuant to 45 CFR 164.316(b)."
    )
    pdf.ln(4)

    pdf.set_font("Helvetica", "B", 14)
    pdf.set_text_color(20, 30, 70)
    pdf.cell(0, 10, "4. HIPAA Breach Notification Rule SLA", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(50, 50, 60)
    pdf.multi_cell(0, 5.5,
        "- Individual Notification: Impacted individuals must be notified in writing without unreasonable delay and in no case "
        "later than 60 calendar days following discovery of an unsecured ePHI breach.\n"
        "- HHS OCR Notification: For breaches affecting 500 or more individuals, notice to the Secretary of Health and "
        "Human Services (HHS) must be provided contemporaneously with individual notices.\n"
        "- Media Notification: Breaches impacting more than 500 residents of a single state or jurisdiction require "
        "formal notification to prominent regional media outlets within 60 calendar days."
    )
    pdf.output(out_path)


def main():
    target_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "sample_compliance_pdfs")
    os.makedirs(target_dir, exist_ok=True)

    files = [
        ("SOC2_Type_II_Information_Security_Policy.pdf", build_soc2_pdf),
        ("Vendor_Data_Processing_Agreement_DPA.pdf", build_vendor_dpa_pdf),
        ("Corporate_Code_of_Ethics_and_Conduct.pdf", build_code_of_conduct_pdf),
        ("HIPAA_and_Healthcare_Data_Safeguards.pdf", build_hipaa_pdf),
    ]

    print(f"Generating enterprise compliance PDFs in: {target_dir}")
    for fname, builder in files:
        fpath = os.path.join(target_dir, fname)
        builder(fpath)
        print(f" -> Generated: {fname} ({os.path.getsize(fpath)} bytes)")

    print("All enterprise compliance PDFs generated successfully!")


if __name__ == "__main__":
    main()

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dataclasses import dataclass
from typing import List, Optional
import pandas as pd
from docx import Document
from docx.enum.text import WD_PARAGRAPH_ALIGNMENT
from models import Base, RiskAssessmentHeader, RiskAssessmentRow
import os
import shutil
from docx.shared import Inches
from datetime import datetime
from jinja2 import Template
import xml.etree.ElementTree as ET
from models import *
from docx.oxml.shared import OxmlElement, qn
from docx.shared import Pt
from docx.enum.text import WD_ALIGN_PARAGRAPH

@dataclass
class RiskAssessmentData:
    """Data class for transferring risk assessment data"""
    reference_number: str
    title: str
    division: str
    location: str
    ra_leader: str
    ra_team: str
    approved_by: str
    signature: str
    designation: str
    last_review_date: str
    next_review_date: str
    date: str

@dataclass
class RiskAssessmentRowData:
    """Data class for transferring risk assessment row data"""
    ref: str
    activity: str
    hazard: str
    possible_injury: str
    existing_controls: str
    severity_initial: int
    likelihood_initial: int
    rpn_initial: int
    additional_controls: str
    severity_final: int
    likelihood_final: int
    rpn_final: int
    implementation_person: str
    due_date: str
    remarks: str
    process_name: str = ""

class RiskAssessmentService:
    def __init__(self, database_url: str = "sqlite:///risk_assessment.db"):
        """
        Initialize the service with database connection
        
        Args:
            database_url: SQLAlchemy database URL
        """
        self.engine = create_engine(database_url, echo=False)
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        
        # Create tables
        Base.metadata.create_all(bind=self.engine)
        
        self.severity_levels = {
            1: "Negligible", 2: "Minor", 3: "Moderate", 4: "Major", 5: "Catastrophic"
        }
        self.likelihood_levels = {
            1: "Rare", 2: "Remote", 3: "Occasional", 4: "Frequent", 5: "Almost certain"
        }
    
    def get_db_session(self):
        """Get database session"""
        return self.SessionLocal()
    
    def create_assessment(self, header_data: RiskAssessmentData, rows_data: List[RiskAssessmentRowData]) -> str:
        """Create a new risk assessment with header and rows"""
        session = self.get_db_session()
        try:
            # Create header
            header = RiskAssessmentHeader(
                assessment_id=header_data.reference_number,
                reference_number=header_data.reference_number,
                title=header_data.title,
                division=header_data.division,
                location=header_data.location,
                ra_leader=header_data.ra_leader,
                ra_team=header_data.ra_team,
                approved_by=header_data.approved_by,
                signature=header_data.signature,
                designation=header_data.designation,
                last_review_date=header_data.last_review_date,
                next_review_date=header_data.next_review_date,
                date=header_data.date
            )
            
            session.add(header)
            session.flush()  # Get the ID
            
            # Create rows
            for row_data in rows_data:
                row = RiskAssessmentRow(
                    assessment_id=header_data.reference_number,
                    ref=row_data.ref,
                    activity=row_data.activity,
                    hazard=row_data.hazard,
                    possible_injury=row_data.possible_injury,
                    existing_controls=row_data.existing_controls,
                    severity_initial=row_data.severity_initial,
                    likelihood_initial=row_data.likelihood_initial,
                    rpn_initial=row_data.rpn_initial,
                    additional_controls=row_data.additional_controls,
                    severity_final=row_data.severity_final,
                    likelihood_final=row_data.likelihood_final,
                    rpn_final=row_data.rpn_final,
                    implementation_person=row_data.implementation_person,
                    due_date=row_data.due_date,
                    remarks=row_data.remarks,
                    process_name=row_data.process_name
                )
                session.add(row)
            
            session.commit()
            return header_data.reference_number
            
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()
    
    def get_assessment(self, assessment_id: str) -> tuple:
        """Get risk assessment by ID"""
        session = self.get_db_session()
        try:
            header = session.query(RiskAssessmentHeader).filter(
                RiskAssessmentHeader.assessment_id == assessment_id
            ).first()
            
            if not header:
                return None, None
            
            rows = session.query(RiskAssessmentRow).filter(
                RiskAssessmentRow.assessment_id == assessment_id
            ).order_by(RiskAssessmentRow.process_name, RiskAssessmentRow.ref).all()
            
            return header, rows
            
        finally:
            session.close()
    
    def get_all_assessments(self) -> List[RiskAssessmentHeader]:
        """Get all risk assessments"""
        session = self.get_db_session()
        try:
            return session.query(RiskAssessmentHeader).all()
        finally:
            session.close()
    
    def update_assessment_row(self, row_id: int, **kwargs):
        """Update a specific risk assessment row"""
        session = self.get_db_session()
        try:
            row = session.query(RiskAssessmentRow).filter(RiskAssessmentRow.id == row_id).first()
            if row:
                for key, value in kwargs.items():
                    if hasattr(row, key):
                        setattr(row, key, value)
                session.commit()
                return row
            return None
        finally:
            session.close()
    
    def delete_assessment(self, assessment_id: str) -> bool:
        """Delete a risk assessment and all its rows"""
        session = self.get_db_session()
        try:
            header = session.query(RiskAssessmentHeader).filter(
                RiskAssessmentHeader.assessment_id == assessment_id
            ).first()
            
            if header:
                session.delete(header)  # Cascade will delete rows
                session.commit()
                return True
            return False
        finally:
            session.close()
    
    def get_risk_acceptability(self, rpn: int) -> str:
        """Determine risk acceptability based on RPN score"""
        if rpn <= 3:
            return "Low - Acceptable"
        elif rpn <= 12:
            return "Medium - Tolerable"
        else:
            return "High - Not acceptable"
    
    def generate_word_document(self, assessment_id: str, output_path: str = None):
        """Generate Word document for a specific assessment"""
        if output_path is None:
            output_path = f"risk_assessment_{assessment_id}.docx"
        
        print(f"Starting document generation for assessment {assessment_id}")
        
        try:
            header, rows = self.get_assessment(assessment_id)
            if not header or not rows:
                raise ValueError(f"Assessment {assessment_id} not found")
            
            print(f"Found {len(rows)} rows for assessment")
            
            doc = Document()
            
            # Add title
            title = doc.add_heading('Risk Assessment Form', 0)
            title.alignment = WD_PARAGRAPH_ALIGNMENT.CENTER
            
            # Add header information table
            header_table = doc.add_table(rows=6, cols=4)
            header_table.style = 'Table Grid'
            
            # Helper function to safely convert values to string
            def safe_str(value):
                return str(value) if value is not None else ""
            
            # Fill header table with safe string conversion
            header_cells = [
                ['Reference Number:', safe_str(header.reference_number), 'Division:', safe_str(header.division)],
                ['Title:', safe_str(header.title), 'Location:', safe_str(header.location)],
                ['RA Leader:', safe_str(header.ra_leader), 'RA Team:', safe_str(header.ra_team)],
                ['Approved by:', safe_str(header.approved_by), 'Signature:', safe_str(header.signature)],
                ['Designation:', safe_str(header.designation), 'Date:', safe_str(header.date)],
                ['Last Review Date:', safe_str(header.last_review_date), 'Next Review Date:', safe_str(header.next_review_date)]
            ]
            
            for i, row_data in enumerate(header_cells):
                for j, cell_data in enumerate(row_data):
                    cell = header_table.cell(i, j)
                    cell.text = cell_data
                    if j % 2 == 0:  # Make labels bold
                        for paragraph in cell.paragraphs:
                            for run in paragraph.runs:
                                run.bold = True
            
            doc.add_paragraph()
            
            # Group rows by process
            processes = {}
            for row in rows:
                process = safe_str(row.process_name) if row.process_name else "General Process"
                if process not in processes:
                    processes[process] = []
                processes[process].append(row)
            
            print(f"Grouped into {len(processes)} processes")
            
            # Create main risk assessment table for each process
            for process_name, process_rows in processes.items():
                print(f"Processing: {process_name} with {len(process_rows)} rows")
                
                # Add process header
                process_header = doc.add_heading(process_name, level=2)
                
                # Create table with appropriate number of rows
                table = doc.add_table(rows=len(process_rows) + 1, cols=15)
                table.style = 'Table Grid'
                
                # Add headers
                headers = [
                    'Ref', 'Activity', 'Hazard', 'Possible Injury/Ill-health', 'Existing Controls',
                    'S', 'L', 'RPN', 'Additional Controls', 'S', 'L', 'RPN',
                    'Implementation Person', 'Due Date', 'Remarks'
                ]
                
                for i, header_text in enumerate(headers):
                    cell = table.cell(0, i)
                    cell.text = header_text
                    # Make header bold
                    for paragraph in cell.paragraphs:
                        for run in paragraph.runs:
                            run.bold = True
                
                # Add data rows
                for row_idx, row_data in enumerate(process_rows, 1):
                    try:
                        row_values = [
                            safe_str(row_data.ref),
                            safe_str(row_data.activity),
                            safe_str(row_data.hazard),
                            safe_str(row_data.possible_injury),
                            safe_str(row_data.existing_controls),
                            safe_str(row_data.severity_initial),
                            safe_str(row_data.likelihood_initial),
                            safe_str(row_data.rpn_initial),
                            safe_str(row_data.additional_controls),
                            safe_str(row_data.severity_final),
                            safe_str(row_data.likelihood_final),
                            safe_str(row_data.rpn_final),
                            safe_str(row_data.implementation_person),
                            safe_str(row_data.due_date),
                            safe_str(row_data.remarks)
                        ]
                        
                        for col_idx, value in enumerate(row_values):
                            table.cell(row_idx, col_idx).text = value
                            
                    except Exception as e:
                        print(f"Error processing row {row_idx}: {e}")
                        # Continue with other rows
                        continue
                
                doc.add_paragraph()
            
            # Add risk matrix legend
            try:
                self._add_risk_matrix_legend(doc)
            except Exception as e:
                print(f"Warning: Could not add risk matrix legend: {e}")
            
            print(f"Saving document to {output_path}")
            doc.save(output_path)
            
            # Verify the file was created and has content
            if os.path.exists(output_path):
                file_size = os.path.getsize(output_path)
                print(f"Document saved successfully. File size: {file_size} bytes")
                if file_size == 0:
                    raise Exception("Generated document is empty")
            else:
                raise Exception("Document file was not created")
            
            return output_path
            
        except Exception as e:
            print(f"Error in document generation: {e}")
            # Clean up any partial file
            if output_path and os.path.exists(output_path):
                try:
                    os.remove(output_path)
                except:
                    pass
            raise e
    
    def _add_risk_matrix_legend(self, doc):
        """Add risk matrix legend to document"""
        doc.add_heading('Risk Assessment Matrix', level=2)
        
        # Severity table
        severity_table = doc.add_table(rows=6, cols=3)
        severity_table.style = 'Table Grid'
        severity_table.cell(0, 0).text = 'Level'
        severity_table.cell(0, 1).text = 'Severity'
        severity_table.cell(0, 2).text = 'Description'
        
        severity_descriptions = [
            (1, 'Negligible', 'Negligible injury'),
            (2, 'Minor', 'Injury requiring first-aid only'),
            (3, 'Moderate', 'Injury requiring medical treatment'),
            (4, 'Major', 'Serious injuries or life-threatening diseases'),
            (5, 'Catastrophic', 'Fatality or multiple major injuries')
        ]
        
        for i, (level, severity, desc) in enumerate(severity_descriptions, 1):
            severity_table.cell(i, 0).text = str(level)
            severity_table.cell(i, 1).text = severity
            severity_table.cell(i, 2).text = desc
        
        doc.add_paragraph()
        
        # Likelihood table
        likelihood_table = doc.add_table(rows=6, cols=3)
        likelihood_table.style = 'Table Grid'
        likelihood_table.cell(0, 0).text = 'Level'
        likelihood_table.cell(0, 1).text = 'Likelihood'
        likelihood_table.cell(0, 2).text = 'Description'
        
        likelihood_descriptions = [
            (1, 'Rare', 'Not expected to occur'),
            (2, 'Remote', 'Not likely under normal circumstances'),
            (3, 'Occasional', 'Possible or known to occur'),
            (4, 'Frequent', 'Common occurrence'),
            (5, 'Almost certain', 'Continual or repeating experience')
        ]
        
        for i, (level, likelihood, desc) in enumerate(likelihood_descriptions, 1):
            likelihood_table.cell(i, 0).text = str(level)
            likelihood_table.cell(i, 1).text = likelihood
            likelihood_table.cell(i, 2).text = desc
    
    def generate_excel_report(self, assessment_id: str, output_path: str = None):
        """Generate Excel report for a specific assessment"""
        if output_path is None:
            output_path = f"risk_assessment_{assessment_id}.xlsx"
        
        header, rows = self.get_assessment(assessment_id)
        if not header or not rows:
            raise ValueError(f"Assessment {assessment_id} not found")
        
        with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
            # Create header dataframe
            header_data = {
                'Field': ['Reference Number', 'Title', 'Division', 'Location', 'RA Leader',
                         'RA Team', 'Approved By', 'Signature', 'Designation', 'Date',
                         'Last Review Date', 'Next Review Date'],
                'Value': [header.reference_number, header.title, header.division, header.location,
                         header.ra_leader, header.ra_team, header.approved_by, header.signature,
                         header.designation, header.date, header.last_review_date, header.next_review_date]
            }
            header_df = pd.DataFrame(header_data)
            header_df.to_excel(writer, sheet_name='Header', index=False)
            
            # Create main data dataframe
            data_list = []
            for row in rows:
                data_list.append({
                    'Ref': row.ref,
                    'Activity': row.activity,
                    'Hazard': row.hazard,
                    'Possible Injury': row.possible_injury,
                    'Existing Controls': row.existing_controls,
                    'Severity Initial': row.severity_initial,
                    'Likelihood Initial': row.likelihood_initial,
                    'RPN Initial': row.rpn_initial,
                    'Additional Controls': row.additional_controls,
                    'Severity Final': row.severity_final,
                    'Likelihood Final': row.likelihood_final,
                    'RPN Final': row.rpn_final,
                    'Implementation Person': row.implementation_person,
                    'Due Date': row.due_date,
                    'Remarks': row.remarks,
                    'Process Name': row.process_name
                })
            
            data_df = pd.DataFrame(data_list)
            data_df.to_excel(writer, sheet_name='Risk Assessment', index=False)
            
            # Create summary by process
            if not data_df.empty:
                summary_df = data_df.groupby('Process Name').agg({
                    'RPN Initial': ['count', 'mean', 'max'],
                    'RPN Final': ['count', 'mean', 'max']
                }).round(2)
                summary_df.to_excel(writer, sheet_name='Summary')


    from docx.shared import Inches
    from datetime import datetime
    from docx.oxml import OxmlElement
    from docx.oxml.ns import qn
    # Example usage functions

    
    def generate_document_template(filename=None, template_type="basic"):
        """
        Generate a Word document template that can be opened in Microsoft Word.
        
        Args:
            filename (str): Name of the file to create. If None, uses timestamp.
            template_type (str): Type of template - "basic", "letter", or "report"
        
        Returns:
            str: Path to the created document
        """
        
        # Create a new document
        doc = Document()
        
        # Set default filename if not provided
        if filename is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"document_template_{timestamp}.docx"
        
        # Ensure filename has .docx extension
        if not filename.endswith('.docx'):
            filename += '.docx'
        
        # Add content based on template type
        if template_type == "basic":
            # Basic template with placeholder text
            doc.add_heading('Document Title', 0)
            doc.add_heading('Section 1', level=1)
            doc.add_paragraph('This is a placeholder paragraph. Replac with your content.')
            doc.add_paragraph('Add more content here as needed.')
            
        elif template_type == "letter":
            # Letter template
            doc.add_paragraph(f'Date: {datetime.now().strftime("%B %d, %Y")}')
            doc.add_paragraph('')
            doc.add_paragraph('[Recipient Name]')
            doc.add_paragraph('[Recipient Address]')
            doc.add_paragraph('')
            doc.add_paragraph('Dear [Recipient Name],')
            doc.add_paragraph('')
            doc.add_paragraph('[Letter content goes here]')
            doc.add_paragraph('')
            doc.add_paragraph('Sincerely,')
            doc.add_paragraph('')
            doc.add_paragraph('[Your Name]')
            
        elif template_type == "report":
            # Report template
            doc.add_heading('Report Title', 0)
            doc.add_paragraph(f'Date: {datetime.now().strftime("%B %d, %Y")}')
            doc.add_paragraph('')
            
            doc.add_heading('Executive Summary', level=1)
            doc.add_paragraph('[Brief overview of the report]')
            
            doc.add_heading('Introduction', level=1)
            doc.add_paragraph('[Background and purpose]')
            
            doc.add_heading('Main Content', level=1)
            doc.add_paragraph('[Detailed information]')
            
            doc.add_heading('Conclusion', level=1)
            doc.add_paragraph('[Summary and recommendations]')
        
        # Save the document
        try:
            doc.save(filename)
            print(f"Document template created successfully: {filename}")
            return os.path.abspath(filename)
        except Exception as e:
            print(f"Error creating document: {e}")
            return None

    def generate_word_document_template(self, output_path):
        try:
            # Create a basic template first
            from docx import Document
            from docx.shared import Inches
            
            # Create document with proper structure
            document = Document()
            
            # Add document properties
            document.core_properties.title = "Risk Assessment"
            document.core_properties.author = "Risk Assessment System"
            
            # Add content with proper formatting
            title = document.add_heading('Risk Assessment Report', 0)
            title.alignment = 1  # Center alignment
            
            # Add sections
            document.add_heading('1. Executive Summary', level=1)
            document.add_paragraph('This section will contain the executive summary.')
            
            document.add_heading('2. Risk Analysis', level=1)
            document.add_paragraph('This section will contain the risk analysis.')
            
            document.add_heading('3. Recommendations', level=1)
            document.add_paragraph('This section will contain recommendations.')
            
            # Add a table for structure
            table = document.add_table(rows=1, cols=3)
            table.style = 'Table Grid'
            hdr_cells = table.rows[0].cells
            hdr_cells[0].text = 'Risk Category'
            hdr_cells[1].text = 'Risk Level'
            hdr_cells[2].text = 'Mitigation Strategy'
            
            # Save the document
            document.save(output_path)
            
            # Verify the saved file
            if os.path.exists(output_path):
                file_size = os.path.getsize(output_path)
                print(f"Template saved successfully. File size: {file_size} bytes")
                
                # Test opening the file
                try:
                    test_doc = Document(output_path)
                    print(f"✓ Document is valid - has {len(test_doc.paragraphs)} paragraphs")
                    return True
                except Exception as e:
                    print(f"✗ Document validation failed: {e}")
                    return False
            else:
                print("✗ File was not created")
                return False
                
        except Exception as e:
            print(f"Error creating template: {e}")
            raise





# Alternative approach using python-docx-template (recommended)
class DocxTemplateGenerator:
    """
    Alternative implementation using python-docx-template library
    This is easier and more robust for complex templates
    """
    
    def __init__(self, template_path="Risk_Assessment_Form_Template.docx"):
        self.template_path = template_path
        
    def generate_word_document(self, assessment_id: str, output_path: str = None):
        """Generate document using docx-template"""
        try:
            # You'll need to install: pip install python-docx-template
            from docxtpl import DocxTemplate
            
            if output_path is None:
                output_path = f"risk_assessment_{assessment_id}.docx"
            
            # Load template
            doc = DocxTemplate(self.template_path)
            
            # Get data
            header, rows = self.get_assessment(assessment_id)
            
            # Prepare context
            context = self.prepare_template_context(header, rows)
            
            # Render template
            doc.render(context)
            
            # Save
            doc.save(output_path)
            
            print(f"Document generated successfully: {output_path}")
            return output_path
            
        except ImportError:
            print("python-docx-template not installed. Please install it with:")
            print("pip install python-docx-template")
            return None
        except Exception as e:
            print(f"Error generating document: {e}")
            return None

    def _center_align_columns(self, row, column_indices):
        """Center align text in specific columns"""
        for col_idx in column_indices:
            if col_idx < len(row.cells):
                for paragraph in row.cells[col_idx].paragraphs:
                    paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
    
    def prepare_template_context(self, header, rows):
        """Prepare context for docx-template"""
        def safe_str(value):
            return str(value) if value is not None else ""
        
        # Header context
        header_context = {}
        if header:
            header_context = {
                'reference_number': safe_str(header.reference_number),
                'division': safe_str(header.division),
                'title': safe_str(header.title),
                'location': safe_str(header.location),
                'ra_leader': safe_str(header.ra_leader),
                'ra_team': safe_str(header.ra_team),
                'approved_by': safe_str(header.approved_by),
                'signature': safe_str(header.signature),
                'designation': safe_str(header.designation),
                'date': safe_str(header.date),
                'last_review_date': safe_str(header.last_review_date),
                'next_review_date': safe_str(header.next_review_date)
            }
        
        # Process rows
        processes = []
        if rows:
            current_process = None
            process_rows = []
            
            for row in rows:
                process_name = safe_str(row.process_name) if hasattr(row, 'process_name') and row.process_name else "General Process"
                
                if current_process != process_name:
                    if current_process is not None:
                        processes.append({
                            'name': current_process,
                            'rows': process_rows
                        })
                    current_process = process_name
                    process_rows = []
                
                process_rows.append({
                    'ref': safe_str(row.ref),
                    'activity': safe_str(row.activity),
                    'hazard': safe_str(row.hazard),
                    'possible_injury': safe_str(row.possible_injury),
                    'existing_controls': safe_str(row.existing_controls),
                    'severity_initial': safe_str(row.severity_initial),
                    'likelihood_initial': safe_str(row.likelihood_initial),
                    'rpn_initial': safe_str(row.rpn_initial),
                    'additional_controls': safe_str(row.additional_controls),
                    'severity_final': safe_str(row.severity_final),
                    'likelihood_final': safe_str(row.likelihood_final),
                    'rpn_final': safe_str(row.rpn_final),
                    'implementation_person': safe_str(row.implementation_person),
                    'due_date': safe_str(row.due_date),
                    'remarks': safe_str(row.remarks)
                })
            
            if current_process is not None:
                processes.append({
                    'name': current_process,
                    'rows': process_rows
                })
        
        return {
            'header': header_context,
            'processes': processes,
            'generation_date': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }

    def generate_with_python_docx(self, assessment_id: str, form_data: dict = None, output_path: str = None):
        """Generate document using template with dynamic risk assessment table"""
        try:
            if output_path is None:
                output_path = f"risk_assessment_{assessment_id}.docx"
            
            # Load the template
            doc = self._load_template()
            if not doc:
                return None
            
            # Debug: Print the incoming form data
            print("=== DEBUG: Incoming form_data ===")
            print(f"form_data type: {type(form_data)}")
            print(f"form_data content: {form_data}")
            print("=== END DEBUG ===")
            
            # Use provided form_data or fallback to sample data
            if form_data is None or not form_data:
                print("No form_data provided, using sample data")
                # Keep your original sample data as fallback
                assessment_data = self._get_sample_data(assessment_id)
            else:
                print("Transforming form_data")
                # Transform the form data into the expected structure
                assessment_data = self._transform_form_data(form_data, assessment_id)
                
                # Debug: Print the transformed data
                print("=== DEBUG: Transformed assessment_data ===")
                print(f"assessment_data: {assessment_data}")
                print("=== END DEBUG ===")
            
            # Process the template
            self._process_template_with_risk_data(doc, assessment_data)
            
            # Save the document
            doc.save(output_path)
            print(f"Risk assessment document generated: {output_path}")
            return output_path
            
        except Exception as e:
            print(f"Error generating document: {e}")
            import traceback
            traceback.print_exc()
            return None

    def _get_sample_data(self, assessment_id: str) -> dict:
        """Return the original sample data"""
        return {
            'basic_info': {
                'assessment_id': assessment_id,
                'division': 'Engineering & Operations',
                'department': 'Safety & Quality Assurance',
                'location': 'Main Plant - Building A',
                'supervisor': 'John Smith',
                'date_created': '2024-01-15',
                'title': 'Merged Cell Layout Test'
            },
            # Work activity inventory data - designed to test merged cells
            'work_activities': [
                # Experiment setup process (3 activities - should merge)
                {
                    'location': 'Laboratory',
                    'process': 'Experiment setup',
                    'work_activity': 'Transfer sample solutions to TOC sample vials, and load them onto TOC autosampler',
                    'remarks': 'Handle with care'
                },
                {
                    'location': 'Laboratory',
                    'process': 'Experiment setup',
                    'work_activity': 'Switch on/off the TOC analyser',
                    'remarks': 'Follow startup procedure'
                },
                {
                    'location': 'Laboratory',
                    'process': 'Experiment setup',
                    'work_activity': 'Switch on synthetic air gas cylinder',
                    'remarks': 'Check pressure gauge'
                },
                
                # Manufacturing process (4 activities - should merge)
                {
                    'location': 'Workshop A',
                    'process': 'Manufacturing',
                    'work_activity': 'CNC machine operation',
                    'remarks': 'Daily production task'
                },
                {
                    'location': 'Workshop A',
                    'process': 'Manufacturing',
                    'work_activity': 'Equipment maintenance',
                    'remarks': 'Weekly preventive maintenance'
                },
                {
                    'location': 'Workshop A',
                    'process': 'Manufacturing',
                    'work_activity': 'Quality control inspection',
                    'remarks': 'Check dimensions and tolerances'
                },
                {
                    'location': 'Workshop A',
                    'process': 'Manufacturing',
                    'work_activity': 'Material handling',
                    'remarks': 'Raw material preparation'
                },
                
                # Chemical Handling process (3 activities - should merge)
                {
                    'location': 'Chemical Store',
                    'process': 'Chemical Handling',
                    'work_activity': 'Chemical dispensing',
                    'remarks': 'PPE mandatory'
                },
                {
                    'location': 'Chemical Store',
                    'process': 'Chemical Handling',
                    'work_activity': 'Waste disposal',
                    'remarks': 'Follow disposal procedures'
                },
                {
                    'location': 'Chemical Store',
                    'process': 'Chemical Handling',
                    'work_activity': 'Inventory tracking',
                    'remarks': 'Daily stock check'
                },
                
                # Assembly process (2 activities - should merge)
                {
                    'location': 'Workshop B',
                    'process': 'Assembly',
                    'work_activity': 'Product assembly',
                    'remarks': 'Main assembly line'
                },
                {
                    'location': 'Workshop B',
                    'process': 'Assembly',
                    'work_activity': 'Final inspection',
                    'remarks': 'Quality assurance check'
                },
                
                # Single activity processes (should not merge)
                {
                    'location': 'Storage Area',
                    'process': 'Logistics',
                    'work_activity': 'Inventory management',
                    'remarks': 'Stock counting and tracking'
                },
                {
                    'location': 'Office',
                    'process': 'Administration',
                    'work_activity': 'Data entry and reporting',
                    'remarks': 'Daily administrative tasks'
                },
                
                # Testing different location, same process (should be separate groups)
                {
                    'location': 'Workshop C',
                    'process': 'Manufacturing',
                    'work_activity': 'Machine setup',
                    'remarks': 'Different location, same process'
                },
                {
                    'location': 'Workshop C',
                    'process': 'Manufacturing',
                    'work_activity': 'Production monitoring',
                    'remarks': 'Continuous oversight'
                }
            ],
            # Risk assessment data that matches your table structure
            'processes': [
                {
                    'process_name': 'Experiment setup',
                    'risks': [
                        {
                            'ref': '1.1',
                            'activity': 'Sample handling',
                            'hazard': 'Chemical exposure',
                            'possible_injury': 'Skin/eye irritation',
                            'existing_controls': 'PPE, fume hood',
                            's1': '3',  # Severity
                            'l1': '2',  # Likelihood  
                            'rpn1': '6',  # Risk Priority Number
                            'additional_controls': 'Emergency eyewash station',
                            's2': '3',  
                            'l2': '1', 
                            'rpn2': '3',
                            'implementation_person': 'Lab Supervisor',
                            'due_date': '2024-03-01',
                            'remarks': 'High priority'
                        },
                        {
                            'ref': '1.2',
                            'activity': 'Equipment operation',
                            'hazard': 'Electrical hazard',
                            'possible_injury': 'Electric shock',
                            'existing_controls': 'Proper grounding, training',
                            's1': '4',
                            'l1': '1',
                            'rpn1': '4',
                            'additional_controls': 'GFCI protection',
                            's2': '4',
                            'l2': '1',
                            'rpn2': '4',
                            'implementation_person': 'Electrical Team',
                            'due_date': '2024-02-15',
                            'remarks': 'Critical safety item'
                        }
                    ]
                },
                {
                    'process_name': 'Manufacturing',
                    'risks': [
                        {
                            'ref': '2.1',
                            'activity': 'CNC operation',
                            'hazard': 'Moving machinery',
                            'possible_injury': 'Crush injury, cuts',
                            'existing_controls': 'Machine guards, emergency stops',
                            's1': '4',
                            'l1': '2',
                            'rpn1': '8',
                            'additional_controls': 'Light curtains, additional training',
                            's2': '4',
                            'l2': '1',
                            'rpn2': '4',
                            'implementation_person': 'Production Manager',
                            'due_date': '2024-04-01',
                            'remarks': 'Review monthly'
                        },
                        {
                            'ref': '2.2',
                            'activity': 'Material handling',
                            'hazard': 'Manual lifting',
                            'possible_injury': 'Back injury, strain',
                            'existing_controls': 'Lifting equipment, training',
                            's1': '2',
                            'l1': '3',
                            'rpn1': '6',
                            'additional_controls': 'Ergonomic assessment',
                            's2': '2',
                            'l2': '2',
                            'rpn2': '4',
                            'implementation_person': 'Safety Officer',
                            'due_date': '2024-03-15',
                            'remarks': 'Include in safety briefing'
                        }
                    ]
                },
                {
                    'process_name': 'Chemical Handling',
                    'risks': [
                        {
                            'ref': '3.1',
                            'activity': 'Chemical dispensing',
                            'hazard': 'Chemical spills',
                            'possible_injury': 'Chemical burns, inhalation',
                            'existing_controls': 'Spill kits, PPE, ventilation',
                            's1': '3',
                            'l1': '2',
                            'rpn1': '6',
                            'additional_controls': 'Automated dispensing system',
                            's2': '3',
                            'l2': '1',
                            'rpn2': '3',
                            'implementation_person': 'Chemical Safety Team',
                            'due_date': '2024-05-01',
                            'remarks': 'Budget approval required'
                        }
                    ]
                }
            ]
        }
        
    def _transform_form_data(self, form_data: dict, assessment_id: str) -> dict:
        """Transform form data into the expected assessment data structure"""
        try:
            print(f"=== TRANSFORM DEBUG: form_data keys: {list(form_data.keys()) if form_data else 'None'}")
            
            # Extract form info and activities data
            form_info = form_data.get('form', {})
            activities_data = form_data.get('activities_data', [])
            
            print(f"=== TRANSFORM DEBUG: form_info: {form_info}")
            print(f"=== TRANSFORM DEBUG: activities_data count: {len(activities_data)}")
            
            # Extract basic info from form data
            basic_info = {
                'assessment_id': assessment_id,
                'division': form_info.get('division', 'N/A'),
                'department': form_info.get('department', 'N/A'),
                'location': form_info.get('location', 'N/A'),
                'supervisor': form_info.get('supervisor', 'N/A'),
                'date_created': form_info.get('last_review_date', 'N/A'),
                'title': form_info.get('title', f'Risk Assessment {assessment_id}')
            }
            
            print(f"=== TRANSFORM DEBUG: basic_info: {basic_info}")
            
            # Transform activities data into work_activities and processes
            work_activities = []
            processes = []
            
            # Group activities by process for the processes section
            process_groups = {}
            
            for activity in activities_data:
                # Add to work activities
                work_activity = {
                    'location': activity.get('location', ''),
                    'process': activity.get('process', ''),
                    'work_activity': activity.get('work_activity', ''),
                    'remarks': activity.get('remarks', '')
                }
                work_activities.append(work_activity)
                
                # Group by process for risk assessment
                process_name = activity.get('process', 'Unknown Process')
                if process_name not in process_groups:
                    process_groups[process_name] = {
                        'process_name': process_name,
                        'risks': []
                    }
                
                # Transform hazards into risks
                hazards = activity.get('hazards', [])
                for i, hazard in enumerate(hazards):
                    # Skip empty hazards
                    if not hazard.get('hazard') and not hazard.get('injury'):
                        continue
                        
                    risk = {
                        'ref': f"{len(process_groups)}.{len(process_groups[process_name]['risks']) + 1}",
                        'activity': activity.get('work_activity', ''),
                        'hazard': hazard.get('hazard', ''),
                        'possible_injury': hazard.get('injury', ''),
                        'existing_controls': hazard.get('existing_controls', ''),
                        's1': str(hazard.get('severity', '')),
                        'l1': str(hazard.get('likelihood', '')),
                        'rpn1': str(hazard.get('rpn', '')),
                        'additional_controls': hazard.get('additional_controls', ''),
                        's2': '',  # These would be filled after additional controls
                        'l2': '',
                        'rpn2': '',
                        'implementation_person': '',
                        'due_date': '',
                        'remarks': ''
                    }
                    process_groups[process_name]['risks'].append(risk)
            
            # Convert process groups to list
            processes = list(process_groups.values())
            
            # Return transformed data structure
            transformed_data = {
                'basic_info': basic_info,
                'work_activities': work_activities,
                'processes': processes
            }
            
            print(f"=== TRANSFORM DEBUG: Final transformed data structure:")
            print(f"  - basic_info: {basic_info}")
            print(f"  - work_activities count: {len(work_activities)}")
            print(f"  - processes count: {len(processes)}")
            for process in processes:
                print(f"    - Process '{process['process_name']}': {len(process['risks'])} risks")
            
            return transformed_data
            
        except Exception as e:
            print(f"Error transforming form data: {e}")
            import traceback
            traceback.print_exc()
            # Return basic structure with assessment_id if transformation fails
            return {
                'basic_info': {
                    'assessment_id': assessment_id,
                    'division': 'Error',
                    'department': 'Error',
                    'location': 'Error',
                    'supervisor': 'Error',
                    'date_created': 'Error',
                    'title': f'Risk Assessment {assessment_id} - Error'
                },
                'work_activities': [],
                'processes': []
            }
    
    def _load_template(self):
        """Load the template document"""
        if not self.template_path:
            print("No template path provided")
            return None
        
        template_paths_to_try = [
            self.template_path,
            os.path.join(os.getcwd(), self.template_path),
            os.path.join('templates', self.template_path),
            os.path.join('app', 'templates', self.template_path),
            os.path.join(os.path.dirname(__file__), self.template_path),
        ]
        
        for path in template_paths_to_try:
            if os.path.exists(path):
                print(f"Loading template: {path}")
                return Document(path)
        
        print(f"Template '{self.template_path}' not found")
        return None
    
    def _process_template_with_risk_data(self, doc, data):
        """Process template and populate with risk assessment data"""
        
        # Replace simple placeholders
        self._replace_simple_placeholders(doc, data['basic_info'])
        
        # Find and populate the risk assessment table
        self._populate_risk_assessment_table(doc, data['processes'])

        #inventory_table = self._find_work_activity_inventory_table(doc)
        inventory_table = self._find_inventory_table(doc)

        if inventory_table:
            self._fill_work_activity_inventory_table(inventory_table, data['work_activities'])
        else:
            print("Work activity inventory table not found in template")

    
    def _replace_simple_placeholders(self, doc, basic_info):
        """Replace simple text placeholders in the document"""
        # Replace in paragraphs
        for paragraph in doc.paragraphs:
            for key, value in basic_info.items():
                placeholder = f"{{{key}}}"
                if placeholder in paragraph.text:
                    paragraph.text = paragraph.text.replace(placeholder, str(value))
        
        # Replace in tables
        for table in doc.tables:
            for row in table.rows:
                for cell in row.cells:
                    for key, value in basic_info.items():
                        placeholder = f"{{{key}}}"
                        if placeholder in cell.text:
                            cell.text = cell.text.replace(placeholder, str(value))
    
    def _populate_risk_assessment_table(self, doc, processes_data):
        """Find and populate the risk assessment table"""
        
        # Find the risk assessment table
        risk_table = self._find_risk_assessment_table(doc)
        if not risk_table:
            print("Risk assessment table not found")
            return
        
        print(f"Found risk assessment table with {len(risk_table.rows)} rows and {len(risk_table.columns)} columns")
        
        # Populate the table with data
        self._fill_risk_assessment_table(risk_table, processes_data)
    
    def _find_risk_assessment_table(self, doc):
        """Find the risk assessment table by looking for specific headers"""
        
        for table in doc.tables:
            # Look for identifying text in the table
            table_text = ""
            for row in table.rows:
                for cell in row.cells:
                    table_text += cell.text.lower() + " "
            
            print(f"Table {len([t for t in doc.tables if t == table])}: {len(table.columns)} columns")
            print(f"Table text sample: {table_text[:300]}...")  # Show more text
            
            # Check if this looks like the risk assessment table (not the inventory table)
            has_risk_keywords = any(keyword in table_text for keyword in [
                "hazard identification", "risk evaluation", "risk control",
                "possible injury", "ill-health", "existing risk controls", 
                "additional controls", "implementation person", "due date",
                "severity", "likelihood", "rpn", "s l rpn"  # Added this common pattern
            ])
            
            has_required_sections = all(required_keyword in table_text for required_keyword in [
                "hazard identification", "risk evaluation", "risk control"
            ])
            
            is_not_inventory = not any(inventory_keyword in table_text for inventory_keyword in [
                "inventory of work activities", 
                "work activity" + " " + "location",  # More specific pattern
                "location" + " " + "process" + " " + "work activity"  # Specific inventory table pattern
            ])

            print(f"Has risk keywords: {has_risk_keywords}")
            print(f"Has required sections: {has_required_sections}")  
            print(f"Is not inventory: {is_not_inventory}")
            
            # Additional check: look for the specific column structure
            has_correct_structure = ("ref" in table_text and 
                                    "activity" in table_text and 
                                    "hazard" in table_text and
                                    len(table.columns) >= 10)  # Risk assessment tables are wide
            
            if has_risk_keywords and has_required_sections and is_not_inventory and has_correct_structure:
                print("Found risk assessment table!")
                return table
        
        print("Risk assessment table not found")
        return None


    def _apply_table_borders(self, row):
        """Apply borders to table row cells to match existing table formatting"""
        try:
            for cell in row.cells:
                # Get the cell's table cell properties
                tc = cell._tc
                tcPr = tc.get_or_add_tcPr()
                
                # Create borders element
                tcBorders = OxmlElement('w:tcBorders')
                
                # Define border style
                border_attrs = {
                    'w:val': 'single',
                    'w:sz': '4',  # Border width
                    'w:space': '0',
                    'w:color': '000000'  # Black color
                }
                
                # Add all borders (top, left, bottom, right)
                for border_name in ['top', 'left', 'bottom', 'right']:
                    border_element = OxmlElement(f'w:{border_name}')
                    for attr_name, attr_value in border_attrs.items():
                        border_element.set(attr_name, attr_value)
                    tcBorders.append(border_element)
                
                tcPr.append(tcBorders)
                
        except Exception as e:
            print(f"Could not apply borders: {e}")

    def _copy_cell_formatting(self, source_cell, target_cell):
        """Copy formatting from source cell to target cell"""
        try:
            # Copy paragraph formatting
            if source_cell.paragraphs and target_cell.paragraphs:
                source_paragraph = source_cell.paragraphs[0]
                target_paragraph = target_cell.paragraphs[0]
                
                # Copy paragraph properties
                if source_paragraph._element.pPr is not None:
                    target_paragraph._element.pPr = source_paragraph._element.pPr
                    
        except Exception as e:
            print(f"Could not copy cell formatting: {e}")

    # Working approach - copy border style from existing row
    def _apply_borders_from_existing_row(self, new_row, existing_row):
        """Copy border formatting from an existing row to a new row"""
        try:
            for i, cell in enumerate(new_row.cells):
                if i < len(existing_row.cells):
                    # Get or create table cell properties for new cell
                    new_tc = cell._tc
                    new_tcPr = new_tc.get_or_add_tcPr()
                    
                    # Get source cell properties
                    source_tc = existing_row.cells[i]._tc
                    source_tcPr = source_tc.tcPr
                    
                    if source_tcPr is not None:
                        # Copy borders if they exist
                        source_borders = source_tcPr.find(qn('w:tcBorders'))
                        if source_borders is not None:
                            # Remove existing borders if any
                            existing_borders = new_tcPr.find(qn('w:tcBorders'))
                            if existing_borders is not None:
                                new_tcPr.remove(existing_borders)
                            
                            # Add copied borders
                            new_tcPr.append(source_borders)
                        
        except Exception as e:
            print(f"Could not copy borders from existing row: {e}")

    # Simplified approach - manually create standard table borders
    def _apply_standard_table_borders(self, row):
        """Apply standard table borders to all cells in a row"""
        try:
            for cell in row.cells:
                # Get or create table cell properties
                tc = cell._tc
                tcPr = tc.get_or_add_tcPr()
                
                # Create borders element
                tcBorders = OxmlElement('w:tcBorders')
                
                # Create each border (top, left, bottom, right)
                for border_name in ['top', 'left', 'bottom', 'right']:
                    border = OxmlElement(f'w:{border_name}')
                    border.set(qn('w:val'), 'single')
                    border.set(qn('w:sz'), '4')
                    border.set(qn('w:space'), '0')
                    border.set(qn('w:color'), '000000')
                    tcBorders.append(border)
                
                # Remove existing borders and add new ones
                existing_borders = tcPr.find(qn('w:tcBorders'))
                if existing_borders is not None:
                    tcPr.remove(existing_borders)
                
                tcPr.append(tcBorders)
                        
        except Exception as e:
            print(f"Could not apply standard borders: {e}")

    def _fill_risk_assessment_table(self, table, processes_data):
        """Fill the risk assessment table with actual data - version with standard borders"""
        
        # Find the first empty row (skip header rows)
        data_start_row = self._find_data_start_row(table)
        
        # Clear existing data rows but keep headers
        rows_to_remove = []
        for i in range(data_start_row, len(table.rows)):
            rows_to_remove.append(i)
        
        # Remove existing data rows (in reverse order to avoid index issues)
        for row_idx in reversed(rows_to_remove):
            if row_idx < len(table.rows):
                table._element.remove(table.rows[row_idx]._element)
        
        # Add data for each process
        for process in processes_data:
            # Add process separator row
            process_row = table.add_row()
            self._apply_standard_table_borders(process_row)
            
            if len(process_row.cells) > 0:
                # Merge all cells in the process row
                merged_cell = process_row.cells[0]
                for i in range(1, len(process_row.cells)):
                    merged_cell.merge(process_row.cells[i])
                
                # Set the process name in the merged cell
                merged_cell.text = process['process_name']
                
                # Make process name bold and optionally center it
                for paragraph in merged_cell.paragraphs:
                    paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER  # Optional: center the text
                    for run in paragraph.runs:
                        run.font.bold = True
            
            # Add risk data rows
            for risk in process['risks']:
                data_row = table.add_row()
                self._apply_standard_table_borders(data_row)
                self._populate_risk_row(data_row, risk)

                center_columns = [5, 6, 7, 9, 10, 11]  # Adjust these indices based on your actual table structure
                self._center_align_columns(data_row, center_columns)

    # Alternative simpler approach - copy border style from existing row
    def _apply_borders_from_existing_row(self, new_row, existing_row):
        """Copy border formatting from an existing row to a new row"""
        try:
            for i, cell in enumerate(new_row.cells):
                if i < len(existing_row.cells):
                    # Copy the table cell properties including borders
                    source_tcPr = existing_row.cells[i]._tc.tcPr
                    if source_tcPr is not None:
                        cell._tc.tcPr = source_tcPr
                        
        except Exception as e:
            print(f"Could not copy borders from existing row: {e}")
    
    def _find_data_start_row(self, table):
        """Find where the data rows start (after headers)"""
        # Look for the first row that doesn't contain header text
        for i, row in enumerate(table.rows):
            row_text = ""
            for cell in row.cells:
                row_text += cell.text.lower()
            
            # If row is mostly empty or contains "process", it's likely a data row
            if not any(header in row_text for header in [
                "hazard identification", "risk evaluation", "ref", "activity", "hazard"
            ]) or "process" in row_text:
                return i
        
        # Default to row 2 if we can't determine
        return 2
    
    def _copy_cell_formatting(self, source_cell, target_cell):
        """Copy formatting from source cell to target cell"""
        try:
            # Copy paragraph formatting
            if source_cell.paragraphs and target_cell.paragraphs:
                source_paragraph = source_cell.paragraphs[0]
                target_paragraph = target_cell.paragraphs[0]
                
                # Copy paragraph properties
                if source_paragraph._element.pPr is not None:
                    target_paragraph._element.pPr = source_paragraph._element.pPr
                    
        except Exception as e:
            print(f"Could not copy cell formatting: {e}")
    
    def _populate_risk_row(self, row, risk_data):
        """Populate a single risk row with data"""
        
        # Column mapping based on your table structure
        column_mapping = {
            0: 'ref',
            1: 'activity', 
            2: 'hazard',
            3: 'possible_injury',
            4: 'existing_controls',
            5: 's1',  # Severity
            6: 'l1',  # Likelihood
            7: 'rpn1',  # RPN
            8: 'additional_controls',
            9: 's2',
            10: 'l2', 
            11: 'rpn2',
            12: 'implementation_person',
            13: 'due_date',
            14: 'remarks'
        }
        
        # Fill the row with data
        for col_idx, field_name in column_mapping.items():
            if col_idx < len(row.cells) and field_name in risk_data:
                row.cells[col_idx].text = str(risk_data[field_name])
    
    def _merge_cells_for_process_name(self, row, total_columns):
        """Merge cells for process name row"""
        try:
            # This is a simplified version - actual cell merging in python-docx
            # requires more complex XML manipulation
            if len(row.cells) > 1:
                # Clear other cells in the row
                for i in range(1, min(len(row.cells), total_columns)):
                    row.cells[i].text = ""
        except Exception as e:
            print(f"Could not merge cells: {e}")
    
    def _add_dynamic_columns_if_needed(self, table, risk_data):
        """Add additional columns if the data requires them"""
        
        if not risk_data:
            return
        
        # Check if we need more columns
        sample_risk = risk_data[0]['risks'][0] if risk_data[0]['risks'] else {}
        required_columns = len(sample_risk.keys())
        current_columns = len(table.columns)
        
        if required_columns > current_columns:
            # Add additional columns
            for _ in range(required_columns - current_columns):
                table.add_column(Inches(0.8))
            
            print(f"Added {required_columns - current_columns} additional columns")

    def _apply_table_borders(self, row):
        """Apply borders to table row cells to match existing table formatting"""
        try:
            for cell in row.cells:
                # Get the cell's table cell properties
                tc = cell._tc
                tcPr = tc.get_or_add_tcPr()
                
                # Create borders element
                tcBorders = OxmlElement('w:tcBorders')
                
                # Define border style
                border_attrs = {
                    'w:val': 'single',
                    'w:sz': '4',  # Border width
                    'w:space': '0',
                    'w:color': '000000'  # Black color
                }
                
                # Add all borders (top, left, bottom, right)
                for border_name in ['top', 'left', 'bottom', 'right']:
                    border_element = OxmlElement(f'w:{border_name}')
                    for attr_name, attr_value in border_attrs.items():
                        border_element.set(attr_name, attr_value)
                    tcBorders.append(border_element)
                
                tcPr.append(tcBorders)
                
        except Exception as e:
            print(f"Could not apply borders: {e}")

   
    def _find_inventory_table(self, doc):
        """Find the inventory of work activities DATA table (not the header table)"""
        
        for i, table in enumerate(doc.tables):
            # Extract all text from the table
            table_text = ""
            for row in table.rows:
                for cell in row.cells:
                    table_text += cell.text.lower().strip() + " "
            
            print(f"Checking table {i+1}: {len(table.columns)} columns, {len(table.rows)} rows")
            print(f"Table text sample: {table_text[:200]}...")
            
            # Look for the DATA table specifically (not the header table)
            # The data table should have the column headers: Ref, Location, Process, Work Activity, Remarks
            has_ref_column = "ref" in table_text
            has_location_column = "location" in table_text
            has_process_column = "process" in table_text
            has_work_activity_column = "work activity" in table_text
            has_remarks_column = "remarks" in table_text
            
            # Check if this table has numbered rows (1, 2, 3, 4, etc.)
            has_numbered_rows = False
            for row in table.rows:
                first_cell = row.cells[0].text.strip()
                if first_cell.isdigit():
                    has_numbered_rows = True
                    break
            
            # Check table structure - should be exactly 5 columns for data table
            has_correct_width = len(table.columns) == 5
            
            # This should NOT be the header table (which has "Reference Number", "Division", etc.)
            is_not_header_table = not any(keyword in table_text for keyword in [
                "reference number", "division", "{title}", "{division}",
                "prs ra repository", "next running number"
            ])
            
            # Ensure it's NOT a risk assessment table
            is_not_risk_table = not any(keyword in table_text for keyword in [
                "hazard identification", "risk evaluation", "severity", "likelihood", 
                "rpn", "existing risk controls", "additional controls", "implementation person"
            ])
            
            print(f"  Has data columns: ref={has_ref_column}, location={has_location_column}, process={has_process_column}")
            print(f"  Has work_activity={has_work_activity_column}, remarks={has_remarks_column}")
            print(f"  Has numbered rows: {has_numbered_rows}")
            print(f"  Correct width (5 cols): {has_correct_width}")
            print(f"  Not header table: {is_not_header_table}")
            print(f"  Not risk table: {is_not_risk_table}")
            
            # Match criteria - must have all data columns and correct structure
            if (has_ref_column and has_location_column and has_process_column and 
                has_work_activity_column and has_remarks_column and 
                has_correct_width and is_not_header_table and is_not_risk_table):
                print(f"Found inventory DATA table at index {i+1}")
                return table
        
        print("Inventory data table not found")
        return None

    def _populate_work_activity_inventory_table(self, doc, activities_data):
        """Find and populate the work activity inventory table"""
        
        inventory_table = self._find_inventory_table(doc)
        
        if not inventory_table:
            print("Work inventory table not found")
            return False
        
        print(f"Found inventory table with {len(inventory_table.rows)} rows and {len(inventory_table.columns)} columns")
        
        # Fill the table with data
        self._fill_work_activity_inventory_table(inventory_table, activities_data)
        return True

    def _temporarilyunused_fill_work_activity_inventory_table(self, table, activities_data):
        """Fill the work activity inventory table - fixed for your template structure"""
        
        print(f"Table structure: {len(table.rows)} rows, {len(table.columns)} columns")
        
        # Based on your debug output:
        # Row 0: Headers
        # Rows 1-4: Template placeholder rows (numbered 1-4, empty content)
        # Row 5: Template instruction text (problematic)
        
        header_row_index = 0
        data_start_row = 1
        
        # Clear all existing data rows (keep only header)
        rows_to_remove = []
        for i in range(data_start_row, len(table.rows)):
            rows_to_remove.append(i)
        
        print(f"Removing {len(rows_to_remove)} existing template rows...")
        for row_idx in reversed(rows_to_remove):
            if row_idx < len(table.rows):
                table._element.remove(table.rows[row_idx]._element)
        
        print(f"After cleanup: {len(table.rows)} rows remain")
        
        # Now add exactly the number of rows we need
        print(f"Adding {len(activities_data)} new data rows...")
        
        # Use the header row as a reference for basic structure
        reference_row = table.rows[header_row_index]
        
        for i, activity in enumerate(activities_data):
            # Add a new row
            new_row = table.add_row()
            
            # Apply consistent formatting
            self._apply_clean_inventory_formatting(new_row)
            
            # Populate the row
            self._populate_inventory_row_clean(new_row, activity, i + 1)
            
            print(f"Added row {i+1}: {activity.get('location', '')} - {activity.get('work_activity', '')}")
        
        print("Table population complete")

    def _apply_clean_inventory_formatting(self, row):
        """Apply clean, consistent formatting to inventory rows"""
        
        try:
            # Apply borders first
            self._apply_standard_table_borders(row)
            
            # Set consistent font and alignment for each cell
            for i, cell in enumerate(row.cells):
                # Clear any existing content
                cell.text = ""
                
                # Ensure we have at least one paragraph
                if not cell.paragraphs:
                    cell.add_paragraph()
                
                # Set paragraph alignment
                for paragraph in cell.paragraphs:
                    if i == 0:  # First column (Ref) - center aligned
                        paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
                    else:  # Other columns - left aligned
                        paragraph.alignment = WD_ALIGN_PARAGRAPH.LEFT
                    
                    # Set font properties
                    for run in paragraph.runs:
                        run.font.name = 'Arial'
                        run.font.size = Pt(10)
            
            print(f"Applied clean formatting to row")
            
        except Exception as e:
            print(f"Warning: Could not apply formatting: {e}")


    def _find_inventory_data_start_row(self, table):
        """Find where the actual data rows start in the inventory table with enhanced debugging"""
        
        print(f"DEBUG: Table has {len(table.rows)} rows, {len(table.columns)} columns")
        
        # Print all rows to understand the structure
        for i, row in enumerate(table.rows):
            row_text = ""
            for j, cell in enumerate(row.cells):
                cell_text = cell.text.strip()
                row_text += f"[{j}:'{cell_text}'] "
            print(f"Row {i}: {row_text}")
        
        # Look for the first numbered row (1, 2, 3, etc.)
        for i, row in enumerate(table.rows):
            first_cell_text = row.cells[0].text.strip()
            print(f"Checking row {i}, first cell: '{first_cell_text}'")
            
            # Skip header row and look for numbered data rows
            if first_cell_text == "1":
                print(f"Found data start at row {i} (first numbered row)")
                return i
            elif first_cell_text.isdigit():
                print(f"Found data start at row {i} (numbered row: {first_cell_text})")
                return i
        
        # Fallback - look for the row after the header row with column names
        for i, row in enumerate(table.rows):
            row_text = ""
            for cell in row.cells:
                row_text += cell.text.lower().strip() + " "
            
            print(f"Checking row {i} for headers: '{row_text}'")
            
            # If this is the header row, data starts next
            if ("ref" in row_text and "location" in row_text and 
                "process" in row_text and "work activity" in row_text):
                print(f"Found header row at {i}, data starts at {i+1}")
                return i + 1
        
        # Last resort - assume row 1 is data (after potential header at row 0)
        print("Using fallback: data starts at row 1")
        return 1

    def _populate_inventory_row_clean(self, row, activity_data, ref_number):
        """Populate inventory row with clean approach"""
        
        try:
            # Data to populate
            cell_data = [
                str(ref_number),
                activity_data.get('location', ''),
                activity_data.get('process', ''),
                activity_data.get('work_activity', ''),
                activity_data.get('remarks', '')
            ]
            
            # Populate each cell
            for i, data in enumerate(cell_data):
                if i < len(row.cells):
                    cell = row.cells[i]
                    
                    # Clear existing content
                    cell.text = ""
                    
                    # Add content
                    if data:
                        cell.text = data
                    
                    # Set alignment and formatting
                    if cell.paragraphs:
                        paragraph = cell.paragraphs[0]
                        
                        # Set alignment
                        if i == 0:  # Ref column - center
                            paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
                        else:  # Other columns - left
                            paragraph.alignment = WD_ALIGN_PARAGRAPH.LEFT
                        
                        # Set font
                        for run in paragraph.runs:
                            run.font.name = 'Arial'
                            run.font.size = Pt(10)
            
            print(f"Populated row {ref_number}: {activity_data.get('location', '')} - {activity_data.get('work_activity', '')}")
            
        except Exception as e:
            print(f"ERROR populating row {ref_number}: {e}")
            # Fallback - just set text
            for i, data in enumerate(cell_data):
                if i < len(row.cells):
                    row.cells[i].text = data

    def _copy_inventory_row_formatting(self, source_row, target_row):
        """Copy formatting from source row to target row"""
        
        try:
            # Ensure target row has enough cells
            while len(target_row.cells) < len(source_row.cells):
                target_row.add_cell()
            
            # Copy formatting for each cell
            for i, (source_cell, target_cell) in enumerate(zip(source_row.cells, target_row.cells)):
                # Copy paragraph formatting
                if source_cell.paragraphs and target_cell.paragraphs:
                    source_para = source_cell.paragraphs[0]
                    target_para = target_cell.paragraphs[0]
                    
                    # Copy alignment
                    if source_para.alignment is not None:
                        target_para.alignment = source_para.alignment
                    
                    # Copy font formatting from runs
                    if source_para.runs:
                        # Clear existing runs in target
                        for run in target_para.runs:
                            run.clear()
                        
                        # Copy from source
                        for source_run in source_para.runs:
                            target_run = target_para.add_run("")
                            if source_run.font.name:
                                target_run.font.name = source_run.font.name
                            if source_run.font.size:
                                target_run.font.size = source_run.font.size
                            if source_run.font.bold is not None:
                                target_run.font.bold = source_run.font.bold
                            if source_run.font.italic is not None:
                                target_run.font.italic = source_run.font.italic
                
                # Copy cell properties (borders, shading)
                self._copy_cell_properties(source_cell, target_cell)
            
            # Apply table borders
            self._apply_standard_table_borders(target_row)
            
        except Exception as e:
            print(f"Warning: Could not copy all formatting: {e}")
            # Fallback to basic formatting
            self._apply_inventory_row_formatting(target_row)

    def _copy_cell_properties(self, source_cell, target_cell):
        """Copy cell-level properties like borders and shading"""
        
        try:
            if hasattr(source_cell, '_element') and hasattr(target_cell, '_element'):
                source_tcPr = source_cell._element.get_or_add_tcPr()
                target_tcPr = target_cell._element.get_or_add_tcPr()
                
                # Copy shading
                source_shd = source_tcPr.find('.//{http://schemas.openxmlformats.org/wordprocessingml/2006/main}shd')
                if source_shd is not None:
                    target_shd = OxmlElement('w:shd')
                    target_shd.set(qn('w:fill'), source_shd.get(qn('w:fill'), 'auto'))
                    target_shd.set(qn('w:val'), source_shd.get(qn('w:val'), 'clear'))
                    target_tcPr.append(target_shd)
                
                # Copy borders
                source_tcBorders = source_tcPr.find('.//{http://schemas.openxmlformats.org/wordprocessingml/2006/main}tcBorders')
                if source_tcBorders is not None:
                    target_tcBorders = OxmlElement('w:tcBorders')
                    target_tcBorders[:] = source_tcBorders[:]
                    target_tcPr.append(target_tcBorders)
        
        except Exception as e:
            print(f"Warning: Could not copy cell properties: {e}")

    def _apply_inventory_row_formatting(self, row):
        """Apply standard formatting to inventory row"""
        
        try:
            for i, cell in enumerate(row.cells):
                # Apply font formatting
                for paragraph in cell.paragraphs:
                    for run in paragraph.runs:
                        run.font.name = 'Arial'
                        run.font.size = Pt(10)
                    
                    # Center align the first column (Ref)
                    if i == 0:
                        paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
                    else:
                        paragraph.alignment = WD_ALIGN_PARAGRAPH.LEFT
            
            # Apply borders
            self._apply_standard_table_borders(row)
        
        except Exception as e:
            print(f"Warning: Could not apply formatting: {e}")

    def _apply_standard_table_borders(self, row):
        """Apply standard table borders to a row"""
        
        try:
            from docx.oxml.ns import nsdecls
            from docx.oxml import parse_xml
            
            for cell in row.cells:
                tcPr = cell._element.get_or_add_tcPr()
                
                # Create border element
                tcBorders = OxmlElement('w:tcBorders')
                
                # Define border style
                border_attrs = {
                    'w:val': 'single',
                    'w:sz': '4',
                    'w:space': '0',
                    'w:color': '000000'
                }
                
                # Add all borders
                for border_name in ['top', 'left', 'bottom', 'right']:
                    border_el = OxmlElement(f'w:{border_name}')
                    for attr, value in border_attrs.items():
                        border_el.set(qn(attr), value)
                    tcBorders.append(border_el)
                
                tcPr.append(tcBorders)
        
        except Exception as e:
            print(f"Warning: Could not apply borders: {e}")


    
    def _fill_work_activity_inventory_table(self, table, activities_data):
        """Fill the work activity inventory table with merged cells for same processes"""
        
        print(f"Table structure: {len(table.rows)} rows, {len(table.columns)} columns")
        
        header_row_index = 0
        data_start_row = 1
        
        # Clear all existing data rows (keep only header)
        rows_to_remove = []
        for i in range(data_start_row, len(table.rows)):
            rows_to_remove.append(i)
        
        print(f"Removing {len(rows_to_remove)} existing template rows...")
        for row_idx in reversed(rows_to_remove):
            if row_idx < len(table.rows):
                table._element.remove(table.rows[row_idx]._element)
        
        print(f"After cleanup: {len(table.rows)} rows remain")
        
        # Group activities by process and location
        grouped_data = self._group_activities_by_process(activities_data)
        
        # Add rows and populate with merging
        self._populate_grouped_inventory_table(table, grouped_data)
        
        print("Table population with merging complete")

    def _group_activities_by_process(self, activities_data):
        """Group activities by location and process for merging"""
        
        grouped = {}
        
        for activity in activities_data:
            location = activity.get('location', '')
            process = activity.get('process', '')
            
            # Create a key combining location and process
            key = f"{location}|{process}"
            
            if key not in grouped:
                grouped[key] = {
                    'location': location,
                    'process': process,
                    'activities': []
                }
            
            grouped[key]['activities'].append({
                'work_activity': activity.get('work_activity', ''),
                'remarks': activity.get('remarks', '')
            })
        
        # Convert to list and sort for consistent ordering
        result = list(grouped.values())
        result.sort(key=lambda x: (x['location'], x['process']))
        
        print(f"Grouped {len(activities_data)} activities into {len(result)} process groups")
        return result

    def _populate_grouped_inventory_table(self, table, grouped_data):
        """Populate table with grouped data and merge cells"""
        
        ref_counter = 1
        
        for group in grouped_data:
            location = group['location']
            process = group['process']
            activities = group['activities']
            
            # Track the starting row for this group
            group_start_row = len(table.rows)
            
            # Add rows for each activity in this group
            for i, activity in enumerate(activities):
                new_row = table.add_row()
                self._apply_clean_inventory_formatting(new_row)

                ref_display = str(ref_counter) if i == 0 else ""
                
                # Populate the row
                self._populate_merged_inventory_row(
                    new_row, 
                    ref_display, 
                    location if i == 0 else "",  # Only show location in first row
                    process if i == 0 else "",   # Only show process in first row
                    activity['work_activity'],
                    activity['remarks']
                )
                
            ref_counter += 1
            
            # Merge cells for location and process columns if multiple activities
            if len(activities) > 1:
                self._merge_process_cells(table, group_start_row, len(activities))
        
        print(f"Populated {ref_counter - 1} total activities")

    def _populate_merged_inventory_row(self, row, ref_display, location, process, work_activity, remarks, is_single_activity=False):
        """Populate a single inventory row (modified for merged layout)"""
        
        try:
            # Data to populate (location and process might be empty for merged rows)
            cell_data = [
                ref_display,
                location,
                process,
                work_activity,
                remarks
            ]
            
            # Populate each cell
            for i, data in enumerate(cell_data):
                if i < len(row.cells):
                    cell = row.cells[i]
                    
                    # Clear existing content
                    cell.text = ""
                    
                    # Add content
                    if data:
                        cell.text = data
                    
                    # Set alignment and formatting
                    if cell.paragraphs:
                        paragraph = cell.paragraphs[0]
                        
                        # Set alignment based on column and content
                        if i == 0:  # Ref column - always center
                            paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
                        elif i == 1:  # Location column
                            if is_single_activity:
                                paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
                            else:
                                paragraph.alignment = WD_ALIGN_PARAGRAPH.LEFT
                        elif i == 2:  # Process column - always left
                            paragraph.alignment = WD_ALIGN_PARAGRAPH.LEFT
                        else:  # Work Activity and Remarks columns - left
                            paragraph.alignment = WD_ALIGN_PARAGRAPH.LEFT
                        
                        # Set font
                        for run in paragraph.runs:
                            run.font.name = 'Arial'
                            run.font.size = Pt(10)

            process_display = process if process else "[continued]"
            print(f"Populated row {ref_display}: {location} - {process_display} - {work_activity}")
                    
        except Exception as e:
            print(f"ERROR populating row {ref_display}: {e}")

    def _merge_process_cells(self, table, start_row_index, num_activities):
        """Merge location and process cells for activities belonging to same process"""
        
        try:

            # Merge ref column (column 0) - same reference number for all activities in process
            if num_activities > 1:
                ref_cell = table.rows[start_row_index].cells[0]
                for i in range(1, num_activities):
                    merge_cell = table.rows[start_row_index + i].cells[0]
                    ref_cell.merge(merge_cell)

            # Merge location column (column 1)
            if num_activities > 1:
                location_cell = table.rows[start_row_index].cells[1]
                for i in range(1, num_activities):
                    merge_cell = table.rows[start_row_index + i].cells[1]
                    location_cell.merge(merge_cell)
            
            # Merge process column (column 2)
            if num_activities > 1:
                process_cell = table.rows[start_row_index].cells[2]
                for i in range(1, num_activities):
                    merge_cell = table.rows[start_row_index + i].cells[2]
                    process_cell.merge(merge_cell)
            
            # Set vertical alignment for merged cells
            self._set_merged_cell_alignment(table.rows[start_row_index].cells[0], 'center')  # Ref - center
            self._set_merged_cell_alignment(table.rows[start_row_index].cells[1])
            self._set_merged_cell_alignment(table.rows[start_row_index].cells[2])
            
            print(f"Merged cells for {num_activities} activities starting at row {start_row_index}")
            
        except Exception as e:
            print(f"ERROR merging cells: {e}")

    def _set_merged_cell_alignment(self, cell, horizontal_align='center'):
        """Set vertical alignment for merged cells"""
        
        try:
            # Set vertical alignment to center
            tc = cell._element
            tcPr = tc.get_or_add_tcPr()
            
            # Create vertical alignment element
            vAlign = OxmlElement('w:vAlign')
            vAlign.set(qn('w:val'), 'center')
            tcPr.append(vAlign)
            
            # Set paragraph alignment
            for paragraph in cell.paragraphs:
                if horizontal_align == 'center':
                    paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
                elif horizontal_align == 'left':
                    paragraph.alignment = WD_ALIGN_PARAGRAPH.LEFT
                elif horizontal_align == 'right':
                    paragraph.alignment = WD_ALIGN_PARAGRAPH.RIGHT
            
        except Exception as e:
            print(f"Warning: Could not set merged cell alignment: {e}")
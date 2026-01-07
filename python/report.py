#!/usr/bin/env python3
"""
A/B 테스트 리포트 PDF 생성 스크립트
"""

import sys
import json
from datetime import datetime
from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# 한글 폰트 설정 (기본 폰트 사용, 필요시 폰트 파일 추가)
try:
    # Windows 기본 한글 폰트 경로 시도
    import platform
    if platform.system() == 'Windows':
        # Malgun Gothic 시도
        try:
            pdfmetrics.registerFont(TTFont('Korean', 'C:/Windows/Fonts/malgun.ttf'))
            KOREAN_FONT = 'Korean'
        except:
            KOREAN_FONT = 'Helvetica'
    else:
        KOREAN_FONT = 'Helvetica'
except:
    KOREAN_FONT = 'Helvetica'

def get_verdict_color(verdict):
    """Verdict에 따른 색상 반환"""
    verdict_lower = verdict.lower().replace(' ', '-')
    if 'variation-우세' in verdict_lower or 'variation우세' in verdict_lower or 'variation-win' in verdict_lower:
        return colors.green
    elif 'control-우세' in verdict_lower or 'control우세' in verdict_lower or 'control-win' in verdict_lower:
        return colors.red
    elif '모수-부족' in verdict or '모수부족' in verdict or 'insufficient' in verdict_lower:
        return colors.yellow
    elif '유보' in verdict:
        return colors.orange  # 유보는 주황색
    else:
        return colors.grey

def create_title_page(doc, results):
    """타이틀 페이지 생성"""
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#2c3e50'),
        spaceAfter=30,
        alignment=1,  # Center
    )
    
    story = []
    story.append(Spacer(1, 2*inch))
    story.append(Paragraph('A/B 테스트 리포트', title_style))
    story.append(Spacer(1, 0.5*inch))
    
    date_style = ParagraphStyle(
        'DateStyle',
        parent=styles['Normal'],
        fontSize=14,
        alignment=1,
    )
    story.append(Paragraph(f'생성일: {datetime.now().strftime("%Y년 %m월 %d일")}', date_style))
    
    if results.get('primaryResults'):
        country = results['primaryResults'][0].get('country', 'N/A')
        story.append(Paragraph(f'국가: {country}', date_style))
    
    story.append(Spacer(1, 1*inch))
    story.append(PageBreak())
    
    return story

def create_config_section(results):
    """설정 요약 섹션"""
    styles = getSampleStyleSheet()
    story = []
    
    heading_style = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontSize=16,
        textColor=colors.HexColor('#34495e'),
        spaceAfter=12,
    )
    
    story.append(Paragraph('설정 요약', heading_style))
    
    config_text = []
    if results.get('primaryResults'):
        kpi_names = list(set(r['kpiName'] for r in results['primaryResults']))
        config_text.append(f"KPIs: {', '.join(kpi_names)}")
    
    for text in config_text:
        story.append(Paragraph(text, styles['Normal']))
        story.append(Spacer(1, 6))
    
    story.append(Spacer(1, 0.3*inch))
    
    return story

def create_kpi_table(results):
    """KPI 결과 테이블 생성"""
    styles = getSampleStyleSheet()
    
    data_list = results.get('primaryResults', [])
    
    if not data_list:
        return []
    
    # 모든 결과를 확인하여 헤더 결정
    # Variation Only가 아닌 결과가 하나라도 있으면 Control Rate, Variation Rate, Uplift, Verdict 포함
    has_non_variation_only = any(r.get('controlValue') is not None for r in data_list)
    # Simple 매트릭이 아닌 결과가 하나라도 있으면 Control/Variation 사용
    has_non_simple = any(r.get('controlRate') is not None or r.get('variationRate') is not None 
                        for r in data_list if r.get('controlValue') is not None)
    
    # 헤더 구성
    headers = ['국가', '디바이스', 'KPI']
    
    # Control/Variation 헤더 결정
    # 모든 결과가 Simple 매트릭이면 Control Count/Variation Count 사용
    if not has_non_simple and has_non_variation_only:
        headers.extend(['Control Count', 'Variation Count'])
    else:
        headers.extend(['Control', 'Variation'])
    
    # Variation Only가 아닌 결과가 있으면 Control Rate, Variation Rate 추가
    if has_non_variation_only:
        headers.extend(['Control Rate', 'Variation Rate'])
    
    # Variation Only가 아닌 결과가 있으면 Uplift 추가
    if has_non_variation_only:
        headers.append('Uplift (%)')
    
    headers.append('Confidence (%)')
    
    # Variation Only가 아닌 결과가 있으면 Verdict 추가
    if has_non_variation_only:
        headers.append('Verdict')
    
    # 데이터 행
    table_data = [headers]
    for result in data_list:
        # 각 결과별로 Variation Only 여부 확인
        result_is_variation_only = result.get('controlValue') is None
        result_is_simple_no_denominator = (result.get('controlRate') is None and 
                                           result.get('variationRate') is None and
                                           not result_is_variation_only)
        
        row = [
            result.get('country', ''),
            result.get('device', ''),
            result.get('kpiName', ''),
        ]
        
        # Control/Variation 값
        control_val = result.get('controlValue')
        variation_val = result.get('variationValue')
        row.append(f"{control_val:.2f}" if control_val is not None else 'N/A')
        row.append(f"{variation_val:.2f}" if variation_val is not None else 'N/A')
        
        # Variation Only가 아니면 Control Rate, Variation Rate 추가
        if not result_is_variation_only:
            row.append(f"{result.get('controlRate', 0):.4f}" if result.get('controlRate') is not None else 'N/A')
            row.append(f"{result.get('variationRate', 0):.4f}" if result.get('variationRate') is not None else 'N/A')
        
        # Variation Only가 아니면 Uplift 추가
        if not result_is_variation_only:
            row.append(f"{result.get('uplift', 0):.2f}%")
        
        # Confidence
        row.append(f"{result.get('confidence', 0):.2f}%" if result.get('confidence') is not None else 'N/A')
        
        # Variation Only가 아니면 Verdict 추가
        if not result_is_variation_only:
            row.append(result.get('verdict', ''))
        
        table_data.append(row)
    
    # 컬럼 너비 계산
    base_widths = [0.6*inch, 0.6*inch, 1.2*inch, 0.7*inch, 0.7*inch]  # 국가, 디바이스, KPI, Control, Variation
    if has_non_variation_only:
        base_widths.extend([0.8*inch, 0.8*inch])  # Control Rate, Variation Rate
    if has_non_variation_only:
        base_widths.append(0.7*inch)  # Uplift
    base_widths.append(0.8*inch)  # Confidence
    if has_non_variation_only:
        base_widths.append(0.9*inch)  # Verdict
    
    # 테이블 생성
    table = Table(table_data, colWidths=base_widths)
    
    # 스타일 적용
    table_style = TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3498db')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 1, colors.grey),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.lightgrey]),
    ])
    
    # Verdict 색상 적용 (Variation Only가 아닌 경우만)
    verdict_col_idx = len(headers) - 1  # Verdict는 마지막 컬럼 (있는 경우)
    for i, result in enumerate(data_list, start=1):
        result_is_variation_only = result.get('controlValue') is None
        if not result_is_variation_only:
            verdict = result.get('verdict', '')
            color = get_verdict_color(verdict)
            table_style.add('BACKGROUND', (verdict_col_idx, i), (verdict_col_idx, i), color)
            if color == colors.yellow or color == colors.grey:
                table_style.add('TEXTCOLOR', (verdict_col_idx, i), (verdict_col_idx, i), colors.black)
            else:
                table_style.add('TEXTCOLOR', (verdict_col_idx, i), (verdict_col_idx, i), colors.white)
    
    table.setStyle(table_style)
    
    return [table]

def create_insights_section(results):
    """인사이트 섹션 생성"""
    styles = getSampleStyleSheet()
    story = []
    
    heading_style = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontSize=16,
        textColor=colors.HexColor('#34495e'),
        spaceAfter=12,
    )
    
    story.append(Paragraph('인사이트', heading_style))
    
    insights = results.get('insights', {})
    
    # 요약
    if insights.get('summary'):
        for item in insights['summary']:
            story.append(Paragraph(f"• {item}", styles['Normal']))
            story.append(Spacer(1, 6))
    
    story.append(Spacer(1, 0.2*inch))
    
    # 추천
    if insights.get('recommendation'):
        rec_style = ParagraphStyle(
            'Recommendation',
            parent=styles['Normal'],
            fontSize=14,
            textColor=colors.HexColor('#856404'),
            backColor=colors.HexColor('#fff3cd'),
            borderPadding=10,
            spaceAfter=12,
        )
        story.append(Paragraph(f"<b>추천:</b> {insights['recommendation']}", rec_style))
    
    story.append(Spacer(1, 0.3*inch))
    
    return story

def create_appendix():
    """부록 섹션 생성"""
    styles = getSampleStyleSheet()
    story = []
    
    heading_style = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontSize=16,
        textColor=colors.HexColor('#34495e'),
        spaceAfter=12,
    )
    
    story.append(PageBreak())
    story.append(Paragraph('부록: 계산 공식', heading_style))
    
    formulas = [
        ("Uplift 계산", "(Variation - Control) / Control × 100%"),
        ("Confidence 계산 (비율)", "Two-sided z-test with unpooled standard error:<br/>z = (pV - pC) / sqrt((pV(1-pV)/nV) + (pC(1-pC)/nC))<br/>p-value = 2 × (1 - Φ(|z|))<br/>Confidence = (1 - p-value) × 100%"),
        ("Verdict 규칙", "• Control 또는 Variation 분자 샘플 크기 < 100: 모수 부족<br/>• 분자 샘플 크기 ≥ 100 AND 신뢰도 ≥ 95% AND Uplift ≥ +3%: Variation 우세<br/>• 분자 샘플 크기 ≥ 100 AND 신뢰도 ≥ 95% AND Uplift ≤ -3%: Control 우세<br/>• 분자 샘플 크기 ≥ 100 AND 신뢰도 ≥ 90% AND < 95% AND Uplift ≥ +3%: Variation 우세 (유보)<br/>• 분자 샘플 크기 ≥ 100 AND 신뢰도 ≥ 90% AND < 95% AND Uplift ≤ -3%: Control 우세 (유보)<br/>• 그 외: 차이 없음<br/><br/>※ 샘플 크기는 분자(numerator) 값을 기준으로 판단합니다."),
    ]
    
    for title, formula in formulas:
        story.append(Paragraph(f"<b>{title}</b>", styles['Heading3']))
        story.append(Paragraph(formula, styles['Normal']))
        story.append(Spacer(1, 12))
    
    return story

def main():
    if len(sys.argv) < 2:
        print("Usage: python report.py <results_json>")
        sys.exit(1)
    
    results_path = sys.argv[1]
    
    # 결과 로드
    with open(results_path, 'r', encoding='utf-8') as f:
        results = json.load(f)
    
    # PDF 생성
    tmp_dir = Path(results_path).parent
    pdf_path = tmp_dir / 'report.pdf'
    
    doc = SimpleDocTemplate(str(pdf_path), pagesize=A4)
    story = []
    
    # 타이틀 페이지
    story.extend(create_title_page(doc, results))
    
    # 설정 요약
    story.extend(create_config_section(results))
    
    # KPI 테이블
    if results.get('primaryResults'):
        heading_style = ParagraphStyle(
            'SectionHeading',
            parent=getSampleStyleSheet()['Heading2'],
            fontSize=16,
            textColor=colors.HexColor('#34495e'),
            spaceAfter=12,
        )
        story.append(Paragraph('KPI 결과', heading_style))
        story.extend(create_kpi_table(results))
        story.append(Spacer(1, 0.3*inch))
    
    # 인사이트
    story.extend(create_insights_section(results))
    
    # 부록
    story.extend(create_appendix())
    
    # PDF 빌드
    doc.build(story)
    
    print(f"PDF report saved to {pdf_path}")

if __name__ == '__main__':
    main()


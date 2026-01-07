#!/usr/bin/env python3
"""
A/B 테스트 리포트 Excel 생성 스크립트
"""

import sys
import json
from datetime import datetime
from pathlib import Path
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

def get_verdict_color(verdict):
    """Verdict에 따른 색상 반환"""
    verdict_lower = str(verdict).lower()
    if 'variation 우세' in verdict_lower and '유보' not in verdict_lower:
        return 'C6EFCE'  # 연한 녹색
    elif 'control 우세' in verdict_lower and '유보' not in verdict_lower:
        return 'FFC7CE'  # 연한 빨간색
    elif '모수 부족' in verdict_lower or '모수부족' in verdict_lower:
        return 'FFEB9C'  # 연한 노란색
    elif '유보' in verdict_lower:
        return 'FFE699'  # 주황색
    else:
        return 'D9D9D9'  # 회색

def create_excel_report(results_path):
    """Excel 리포트 생성"""
    # 결과 로드
    with open(results_path, 'r', encoding='utf-8') as f:
        results = json.load(f)
    
    # Excel 워크북 생성
    wb = Workbook()
    ws = wb.active
    ws.title = "AB 테스트 리포트"  # Excel 시트 이름에 "/" 사용 불가
    
    # 스타일 정의
    header_fill = PatternFill(start_color="3498DB", end_color="3498DB", fill_type="solid")
    header_font = Font(bold=True, color="FFFFFF", size=11)
    title_font = Font(bold=True, size=14)
    border = Border(
        left=Side(style='thin'),
        right=Side(style='thin'),
        top=Side(style='thin'),
        bottom=Side(style='thin')
    )
    center_align = Alignment(horizontal='center', vertical='center')
    
    row = 1
    
    # 타이틀
    ws.merge_cells(f'A{row}:K{row}')
    cell = ws[f'A{row}']
    cell.value = "A/B 테스트 리포트"
    cell.font = title_font
    cell.alignment = center_align
    row += 2
    
    # 생성일
    ws[f'A{row}'] = f"생성일: {datetime.now().strftime('%Y년 %m월 %d일 %H:%M')}"
    row += 2
    
    # KPI 결과
    if results.get('primaryResults') and len(results['primaryResults']) > 0:
        # 리포트 순서별로 그룹화
        report_order_groups = {}
        for r in results['primaryResults']:
            report_order = r.get('reportOrder', '1st report')
            if report_order not in report_order_groups:
                report_order_groups[report_order] = []
            report_order_groups[report_order].append(r)
        
        # 리포트 순서 정렬
        sorted_report_orders = sorted(report_order_groups.keys(), key=lambda x: (
            int(x.split()[0]) if x.split()[0].isdigit() else 999
        ))
        
        for report_order in sorted_report_orders:
            report_results = report_order_groups[report_order]
            
            # 리포트 순서 제목
            ws.merge_cells(f'A{row}:K{row}')
            cell = ws[f'A{row}']
            cell.value = f"{report_order}"
            cell.font = Font(bold=True, size=16)
            cell.fill = PatternFill(start_color="3498DB", end_color="3498DB", fill_type="solid")
            cell.font = Font(bold=True, color="FFFFFF", size=14)
            cell.alignment = center_align
            row += 1
            
            # 국가별로 그룹화
            country_groups = {}
            for r in report_results:
                country = r.get('country', 'Unknown')
                if country not in country_groups:
                    country_groups[country] = []
                country_groups[country].append(r)
            
            sorted_countries = sorted(country_groups.keys())
            
            for country in sorted_countries:
                country_results = country_groups[country]
                
                # 국가 제목
                ws.merge_cells(f'A{row}:K{row}')
                cell = ws[f'A{row}']
                cell.value = f"  {country}"
                cell.font = Font(bold=True, size=13)
                cell.fill = PatternFill(start_color="95A5A6", end_color="95A5A6", fill_type="solid")
                cell.font = Font(bold=True, color="FFFFFF", size=12)
                row += 1
                
                # KPI별로 그룹화
                kpi_groups = {}
                for r in country_results:
                    kpi_name = r.get('kpiName', 'Unknown')
                    if kpi_name not in kpi_groups:
                        kpi_groups[kpi_name] = []
                    kpi_groups[kpi_name].append(r)
                
                for kpi_name, kpi_results in kpi_groups.items():
                    # 모든 결과를 확인하여 헤더 결정
                    # Variation Only가 아닌 결과가 하나라도 있으면 Control Rate, Variation Rate, Uplift, Verdict 포함
                    has_non_variation_only = any(r.get('controlValue') is not None for r in kpi_results)
                    # Simple 매트릭이 아닌 결과가 하나라도 있으면 Control/Variation 사용
                    has_non_simple = any(r.get('controlRate') is not None or r.get('variationRate') is not None 
                                        for r in kpi_results if r.get('controlValue') is not None)
                    
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
                    headers.append('샘플 크기')
                    
                    # Variation Only가 아닌 결과가 있으면 Verdict 추가
                    if has_non_variation_only:
                        headers.append('Verdict')
                    
                    # KPI 제목 (merge 범위 조정)
                    max_col = len(headers)
                    col_letter = get_column_letter(max_col)
                    ws.merge_cells(f'A{row}:{col_letter}{row}')
                    cell = ws[f'A{row}']
                    cell.value = f"    {kpi_name}"
                    cell.font = Font(bold=True, size=12)
                    cell.fill = PatternFill(start_color="E8F4F8", end_color="E8F4F8", fill_type="solid")
                    row += 1
                    
                    # 헤더
                    for col, header in enumerate(headers, start=1):
                        cell = ws.cell(row=row, column=col)
                        cell.value = header
                        cell.fill = header_fill
                        cell.font = header_font
                        cell.alignment = center_align
                        cell.border = border
                    row += 1
                    
                    # 데이터
                    for r in kpi_results:
                        # 각 결과별로 Variation Only 여부 확인
                        result_is_variation_only = r.get('controlValue') is None
                        result_is_simple_no_denominator = (r.get('controlRate') is None and 
                                                           r.get('variationRate') is None and
                                                           not result_is_variation_only)
                        
                        col = 1
                        ws.cell(row=row, column=col, value=r.get('country', ''))
                        col += 1
                        ws.cell(row=row, column=col, value=r.get('device', ''))
                        col += 1
                        ws.cell(row=row, column=col, value=r.get('kpiName', ''))
                        col += 1
                        ws.cell(row=row, column=col, value=r.get('controlValue', 0) if r.get('controlValue') is not None else 'N/A')
                        col += 1
                        ws.cell(row=row, column=col, value=r.get('variationValue', 0) if r.get('variationValue') is not None else 'N/A')
                        col += 1
                        
                        # Variation Only가 아니면 Control Rate, Variation Rate 추가
                        if not result_is_variation_only:
                            ws.cell(row=row, column=col, value=r.get('controlRate', 0) if r.get('controlRate') is not None else 'N/A')
                            col += 1
                            ws.cell(row=row, column=col, value=r.get('variationRate', 0) if r.get('variationRate') is not None else 'N/A')
                            col += 1
                        
                        # Variation Only가 아니면 Uplift 추가
                        if not result_is_variation_only:
                            ws.cell(row=row, column=col, value=r.get('uplift', 0))
                            col += 1
                        
                        ws.cell(row=row, column=col, value=r.get('confidence', 0) if r.get('confidence') is not None else 'N/A')
                        col += 1
                        ws.cell(row=row, column=col, value=r.get('denominatorSize', 0))
                        col += 1
                        
                        # Variation Only가 아니면 Verdict 추가
                        if not result_is_variation_only:
                            verdict_cell = ws.cell(row=row, column=col, value=r.get('verdict', ''))
                            verdict_cell.fill = PatternFill(start_color=get_verdict_color(r.get('verdict', '')), end_color=get_verdict_color(r.get('verdict', '')), fill_type="solid")
                            verdict_cell.alignment = center_align
                            col += 1
                        
                        # 모든 셀에 테두리 적용
                        for c in range(1, col):
                            ws.cell(row=row, column=c).border = border
                        
                        row += 1
                    
                    row += 1
                
                row += 1
            
            row += 1
    
    # 인사이트 섹션
    if results.get('insights'):
        row += 1
        ws.merge_cells(f'A{row}:K{row}')
        cell = ws[f'A{row}']
        cell.value = "인사이트"
        cell.font = title_font
        cell.fill = PatternFill(start_color="E8F4F8", end_color="E8F4F8", fill_type="solid")
        row += 1
        
        insights = results['insights']
        if insights.get('summary'):
            for item in insights['summary']:
                ws.merge_cells(f'A{row}:K{row}')
                ws[f'A{row}'] = f"• {item}"
                row += 1
        
        if insights.get('recommendation'):
            row += 1
            ws.merge_cells(f'A{row}:K{row}')
            cell = ws[f'A{row}']
            cell.value = f"추천: {insights['recommendation']}"
            cell.font = Font(bold=True, size=12)
            cell.fill = PatternFill(start_color="FFF3CD", end_color="FFF3CD", fill_type="solid")
            row += 1
    
    # 컬럼 너비 조정
    ws.column_dimensions['A'].width = 10
    ws.column_dimensions['B'].width = 10
    ws.column_dimensions['C'].width = 25
    ws.column_dimensions['D'].width = 12
    ws.column_dimensions['E'].width = 12
    ws.column_dimensions['F'].width = 15
    ws.column_dimensions['G'].width = 15
    ws.column_dimensions['H'].width = 12
    ws.column_dimensions['I'].width = 15
    ws.column_dimensions['J'].width = 12
    ws.column_dimensions['K'].width = 20
    
    # 파일 저장
    tmp_dir = Path(results_path).parent
    excel_path = tmp_dir / 'report.xlsx'
    wb.save(excel_path)
    
    print(f"Excel report saved to {excel_path}")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python report_excel.py <results_json>")
        sys.exit(1)
    
    create_excel_report(sys.argv[1])


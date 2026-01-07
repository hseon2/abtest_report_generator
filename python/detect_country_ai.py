#!/usr/bin/env python3
"""
AI를 사용하여 Excel 파일에서 국가 자동 감지
"""

import os
import sys
import json
import requests
import pandas as pd

def detect_country_with_ai(file_path, api_key=None):
    """
    AI를 사용하여 Excel 파일에서 국가 추출
    
    Args:
        file_path: Excel 파일 경로
        api_key: Gemini API 키 (없으면 환경 변수에서 가져옴)
    
    Returns:
        감지된 국가 코드 (없으면 None)
    """
    if api_key is None:
        api_key = os.getenv('GEMINI_API_KEY')
    
    if not api_key:
        print("Warning: GEMINI_API_KEY 환경 변수가 설정되지 않았습니다.", file=sys.stderr)
        return None
    
    # Excel 파일 읽기
    try:
        df = pd.read_excel(file_path, header=None)
    except Exception as e:
        print(f"Excel 파일 읽기 오류: {e}", file=sys.stderr)
        return None
    
    # Segments 행 찾기
    segments_row = None
    for idx in range(min(50, len(df))):
        row = df.iloc[idx]
        if pd.notna(row[0]) and 'Segments' in str(row[0]):
            segments_row = idx
            break
    
    if segments_row is None:
        segments_row = 0
    
    # Segments 행 이후 데이터에서 "Visits" 행 찾기
    data_start = segments_row + 1
    visits_row_idx = None
    
    for idx in range(data_start, min(data_start + 100, len(df))):
        row = df.iloc[idx]
        if pd.notna(row[0]):
            first_col = str(row[0]).strip().lower()
            if 'visits' in first_col:
                visits_row_idx = idx
                break
    
    # Visits 행 주변 텍스트 추출 (위 5행, 아래 10행)
    context_texts = []
    if visits_row_idx is not None:
        start_idx = max(0, visits_row_idx - 5)
        end_idx = min(len(df), visits_row_idx + 10)
        
        for idx in range(start_idx, end_idx):
            row = df.iloc[idx]
            # 첫 번째 컬럼의 텍스트만 추출
            if pd.notna(row[0]):
                text = str(row[0]).strip()
                # 주석이나 빈 값 제외
                if text and not text.startswith('#') and not text.startswith('='):
                    context_texts.append(text)
    
    if not context_texts:
        return None
    
    # 가능한 국가 코드 리스트
    country_codes = ['N_AFRICA', 'AFRICA_EN', 'AFRICA_PT', 'AFRICA_FR', 'EG', 'ZA', 'AU', 'CN', 'HK', 'HK_EN', 'TW', 
                     'IN', 'ID', 'JP', 'SEC', 'MY', 'MM', 'NZ', 'PH', 'SG', 'TH', 'VN', 'BD', 'MN', 'AL', 'AT', 'AZ', 
                     'BE', 'BE_FR', 'BG', 'BA', 'HR', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IL', 'IT', 
                     'KZ_KZ', 'KZ_RU', 'LV', 'LT', 'NL', 'NO', 'MK', 'PL', 'PT', 'RO', 'RS', 'SK', 'SI', 'ES', 'SE', 
                     'CH', 'CH_FR', 'TR', 'UA', 'UK', 'UZ_UZ', 'UZ_RU', 'GE', 'AR', 'LATIN_EN', 'LATIN', 'BR', 'CL', 
                     'CO', 'MX', 'PE', 'PY', 'UY', 'PK', 'AE_AR', 'AE', 'IRAN', 'LEVANT', 'LEVANT_AR', 'SA', 'SA_EN', 
                     'IQ_AR', 'IQ_KU', 'KB', 'CA', 'CA_FR', 'US', 'PS']
    
    # 프롬프트 생성
    context = '\n'.join(context_texts[:20])  # 최대 20개 텍스트만 사용
    prompt = f"""다음은 Adobe Analytics A/B 테스트 Excel 파일에서 추출한 텍스트입니다:

{context}

위 텍스트에서 국가 코드를 찾아주세요. 가능한 국가 코드 목록은 다음과 같습니다:
{', '.join(country_codes)}

텍스트에서 정확히 일치하는 국가 코드를 찾아서 답변해주세요. 국가 코드만 답변해주세요. (예: UK, US, JP, KR 등)
찾지 못하면 "NOT_FOUND"를 답변해주세요."""
    
    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key={api_key}"
        
        payload = {
            "contents": [{
                "parts": [{"text": prompt}]
            }],
            "generationConfig": {
                "temperature": 0.3,
                "topK": 40,
                "topP": 0.95,
                "maxOutputTokens": 50,
            }
        }
        
        response = requests.post(url, json=payload, timeout=15)
        response.raise_for_status()
        result = response.json()
        
        if 'candidates' in result and len(result['candidates']) > 0:
            content = result['candidates'][0].get('content', {})
            parts = content.get('parts', [])
            if parts and len(parts) > 0:
                ai_response = parts[0].get('text', '').strip().upper()
                
                # AI 응답에서 국가 코드 추출
                for code in country_codes:
                    if code in ai_response or ai_response == code:
                        return code
                
                # NOT_FOUND가 아닌 경우 응답 자체를 국가 코드로 사용 시도
                if ai_response != 'NOT_FOUND' and ai_response in country_codes:
                    return ai_response
        
        return None
        
    except Exception as e:
        print(f"AI 국가 감지 오류: {e}", file=sys.stderr)
        return None


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python detect_country_ai.py <excel_file_path>", file=sys.stderr)
        sys.exit(1)
    
    file_path = sys.argv[1]
    result = detect_country_with_ai(file_path)
    if result:
        print(result)
    else:
        print('UK')  # 기본값


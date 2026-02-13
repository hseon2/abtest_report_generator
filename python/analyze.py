#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Adobe Analytics A/B 테스트 데이터 분석 스크립트
"""

import sys
import json
import pandas as pd
import numpy as np
from scipy.stats import norm
from pathlib import Path

# Windows 콘솔 인코딩 설정
if sys.platform == 'win32':
    import io
    try:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
    except:
        pass  # 이미 설정되어 있으면 무시

class JSONEncoder(json.JSONEncoder):
    """NaN과 Infinity 값을 null로 변환하는 커스텀 JSON 인코더"""
    def default(self, obj):
        if isinstance(obj, (float, np.floating)):
            if np.isnan(obj) or np.isinf(obj):
                return None
            return obj
        return super().default(obj)
    
    def encode(self, obj):
        # 재귀적으로 NaN 값 처리
        if isinstance(obj, dict):
            obj = {k: self._handle_nan(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            obj = [self._handle_nan(item) for item in obj]
        return super().encode(obj)
    
    def _handle_nan(self, value):
        if isinstance(value, dict):
            return {k: self._handle_nan(v) for k, v in value.items()}
        elif isinstance(value, list):
            return [self._handle_nan(item) for item in value]
        elif isinstance(value, (float, np.floating)):
            if np.isnan(value) or np.isinf(value):
                return None
            return value
        elif pd.isna(value):
            return None
        return value

def find_segments_row(df):
    """'Segments' 행을 찾아 데이터 시작 위치 반환"""
    for idx, row in df.iterrows():
        # 첫 번째 컬럼에 "Segments"가 포함되어 있는지 확인
        if pd.notna(row[0]) and 'Segments' in str(row[0]):
            return idx
    return 0

def parse_excel(file_path):
    """
    Excel 또는 CSV 파일 파싱
    실제 구조:
    - A열: 세그먼트 이름 (메트릭 이름)
    - B열: All Visits - Control
    - C열: All Visits - Variation
    - D열: 세그먼트 1 - Control
    - E열: 세그먼트 1 - Variation
    - F열: 세그먼트 2 - Control
    - G열: 세그먼트 2 - Variation
    """
    file_path_obj = Path(file_path)
    file_ext = file_path_obj.suffix.lower()
    
    # 파일 확장자에 따라 읽기
    if file_ext == '.csv':
        # CSV 파일 읽기 (인코딩 자동 감지 시도)
        try:
            df = pd.read_csv(file_path, header=None, encoding='utf-8')
        except UnicodeDecodeError:
            # UTF-8 실패 시 다른 인코딩 시도
            try:
                df = pd.read_csv(file_path, header=None, encoding='cp949')
            except:
                df = pd.read_csv(file_path, header=None, encoding='latin-1')
    elif file_ext in ['.xlsx', '.xls']:
        df = pd.read_excel(file_path, header=None)
    else:
        raise ValueError(f"지원하지 않는 파일 형식입니다: {file_ext}. .xlsx, .xls, .csv만 지원합니다.")
    
    # Segments 행 찾기 (첫 번째 컬럼에 "Segments"가 포함된 행)
    segments_row = None
    for idx, row in df.iterrows():
        if pd.notna(row[0]) and 'Segments' in str(row[0]) and str(row[0]).strip().startswith('Segments'):
            segments_row = idx
            break
    
    if segments_row is None:
        raise ValueError("'Segments' 행을 찾을 수 없습니다. 파일 형식을 확인해주세요.")
    
    # Segments 행의 헤더 읽기
    segments_header_row = df.iloc[segments_row]
    segment_names = {}
    
    # 세그먼트 이름은 Segments 행의 위 위 행 (segments_row - 2)에서 추출
    # Segments 행 위 위 행에 세그먼트 이름이 있다고 가정
    segment_name_row_idx = segments_row - 2
    if segment_name_row_idx >= 0:
        segment_name_row = df.iloc[segment_name_row_idx]
        
        # B-C는 All (첫 번째 세그먼트)
        # 세그먼트 이름 행의 C 컬럼(인덱스 2)에서 세그먼트 이름 추출
        if pd.notna(segment_name_row.iloc[2]):  # C 컬럼 (인덱스 2)
            segment_name_bc = str(segment_name_row.iloc[2]).strip()
            segment_names['B'] = segment_name_bc if segment_name_bc else 'All'
            segment_names['C'] = segment_name_bc if segment_name_bc else 'All'
        else:
            segment_names['B'] = 'All'
            segment_names['C'] = 'All'
        
        # D부터는 세그먼트 이름 행의 해당 컬럼에서 추출
        # 컬럼 매핑: 인덱스 0=A, 1=B, 2=C, 3=D, 4=E, 5=F, 6=G, 7=H, 8=I, ...
        col_letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T']
        col_idx = 3  # D는 인덱스 3부터 시작
        
        segment_count = 0
        while col_idx + 1 < len(segment_name_row) and segment_count < 15:  # 최대 15개 세그먼트까지 처리
            control_col_idx = col_idx
            variation_col_idx = col_idx + 1
            
            # 세그먼트 이름 행에서 세그먼트 이름 읽기
            control_segment_name = segment_name_row.iloc[control_col_idx] if control_col_idx < len(segment_name_row) else None
            variation_segment_name = segment_name_row.iloc[variation_col_idx] if variation_col_idx < len(segment_name_row) else None
            
            if pd.notna(control_segment_name) or pd.notna(variation_segment_name):
                segment_name_val = str(control_segment_name if pd.notna(control_segment_name) else variation_segment_name).strip()
                
                # "- Control", "- Variation" 같은 접미사 제거
                segment_name_val = segment_name_val.replace('- Control', '').replace('- Variation', '').replace('Control', '').replace('Variation', '').strip()
                
                if segment_name_val and segment_name_val.lower() not in ['nan', 'none', '']:
                    # 컬럼 문자 직접 계산 (col_idx가 3이면 D, 4면 E)
                    if col_idx < len(col_letters):
                        control_col = col_letters[col_idx]
                        if col_idx + 1 < len(col_letters):
                            variation_col = col_letters[col_idx + 1]
                            
                            segment_names[control_col] = segment_name_val
                            segment_names[variation_col] = segment_name_val
                            segment_count += 1
                            
                            print(f"DEBUG: 세그먼트 감지 - 이름: {segment_name_val}, 컬럼: {control_col}-{variation_col}, 인덱스: {col_idx}-{col_idx+1}")
            
            col_idx += 2  # 다음 Control/Variation 쌍으로 이동 (D-E -> F-G -> H-I ...)
    else:
        # 기본값
        segment_names['B'] = 'All'
        segment_names['C'] = 'All'
    
    # B열에서 국가 코드 감지
    countries_from_b = detect_countries_from_b_column(df, segments_row)
    
    # 국가별 컬럼 매핑 생성
    country_column_mapping = {}  # {country: [(segment_name, control_col, variation_col), ...]}
    
    # 국가 추출: B열에 국가 코드가 없으면 기존 방법 사용
    if countries_from_b is None or len(countries_from_b) == 0:
        # B열에 국가 코드가 없으면 단일 국가 테스트
        country = detect_country_from_excel(df, segments_row)
        is_multi_country = False
        countries = [country]
        # 단일 국가인 경우 기존 세그먼트 매핑 사용
        country_column_mapping[country] = None  # None이면 기본 세그먼트 매핑 사용
    else:
        # B열에 국가 코드가 있으면 여러 국가 테스트
        is_multi_country = True
        countries = countries_from_b
        country = countries[0] if countries else 'UK'  # 기본값으로 첫 번째 국가 사용
        
        # 각 국가별로 컬럼 매핑 생성
        # 세그먼트 이름 행에서 국가 코드를 찾아 컬럼 매핑
        segment_name_row_idx = segments_row - 2
        if segment_name_row_idx >= 0:
            segment_name_row = df.iloc[segment_name_row_idx]
            col_letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T']
            common_countries = ['N_AFRICA', 'AFRICA_EN', 'AFRICA_PT', 'AFRICA_FR', 'EG', 'ZA', 'AU', 'CN', 'HK', 'HK_EN', 'TW', 
                               'IN', 'ID', 'JP', 'SEC', 'MY', 'MM', 'NZ', 'PH', 'SG', 'TH', 'VN', 'BD', 'MN', 'AL', 'AT', 'AZ', 
                               'BE', 'BE_FR', 'BG', 'BA', 'HR', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IL', 'IT', 
                               'KZ_KZ', 'KZ_RU', 'LV', 'LT', 'NL', 'NO', 'MK', 'PL', 'PT', 'RO', 'RS', 'SK', 'SI', 'ES', 'SE', 
                               'CH', 'CH_FR', 'TR', 'UA', 'UK', 'UZ_UZ', 'UZ_RU', 'GE', 'AR', 'LATIN_EN', 'LATIN', 'BR', 'CL', 
                               'CO', 'MX', 'PE', 'PY', 'UY', 'PK', 'AE_AR', 'AE', 'IRAN', 'LEVANT', 'LEVANT_AR', 'SA', 'SA_EN', 
                               'IQ_AR', 'IQ_KU', 'KB', 'CA', 'CA_FR', 'US', 'PS']
            
            col_idx = 1  # B열부터 시작
            max_cols = min(len(segment_name_row), 50)
            
            while col_idx < max_cols:
                control_col_value = segment_name_row.iloc[col_idx] if col_idx < len(segment_name_row) else None
                
                if pd.notna(control_col_value):
                    control_value_str = str(control_col_value).strip().upper()
                    
                    # 국가 코드 찾기
                    for country_code in countries:
                        if (control_value_str == country_code or 
                            country_code in control_value_str or 
                            control_value_str in country_code):
                            # 해당 국가의 컬럼 매핑 생성
                            if country_code not in country_column_mapping:
                                country_column_mapping[country_code] = []
                            
                            control_col = col_letters[col_idx] if col_idx < len(col_letters) else None
                            variation_col = col_letters[col_idx + 1] if col_idx + 1 < len(col_letters) else None
                            
                            if control_col and variation_col:
                                # 세그먼트 이름 추출 (국가 코드 제거)
                                segment_name = control_value_str.replace(country_code, '').strip()
                                if not segment_name:
                                    segment_name = 'All'
                                
                                country_column_mapping[country_code].append((segment_name, control_col, variation_col))
                            break
                
                col_idx += 2  # 다음 Control-Variation 쌍으로 이동
    
    # 실제 데이터는 Segments 행 다음 행부터 시작
    data_start = segments_row + 1
    data_df = df.iloc[data_start:].copy()
    
    # 컬럼 이름 설정 (A: 메트릭 이름, B부터는 값들)
    max_cols = max(len(data_df.columns), 20)  # 충분한 컬럼 확보
    col_names = ['A'] + [chr(66 + i) for i in range(max_cols - 1)]  # A, B, C, D, ...
    if len(data_df.columns) < len(col_names):
        # 부족한 컬럼 추가
        for i in range(len(data_df.columns), len(col_names)):
            data_df[f'col_{i}'] = None
    
    data_df.columns = col_names[:len(data_df.columns)]
    
    # 세그먼트 정보를 데이터프레임에 저장
    data_df.attrs['segment_names'] = segment_names
    data_df.attrs['is_multi_country'] = is_multi_country
    data_df.attrs['countries'] = countries
    data_df.attrs['country_column_mapping'] = country_column_mapping
    
    # 빈 행 제거 (A열이 비어있거나 주석인 행 제거)
    def is_valid_row(row):
        a_val = str(row['A']) if pd.notna(row['A']) else ''
        a_clean = a_val.strip()
        # 주석이나 구분선 행 제거
        if (a_clean.startswith('#') or a_clean.startswith('=') or 
            '====' in a_val or '####' in a_val or a_clean == ''):
            return False
        return True
    
    data_df = data_df[data_df.apply(is_valid_row, axis=1)]
    
    # 숫자 컬럼(B부터)의 데이터 타입 변환
    numeric_cols = [col for col in data_df.columns if col != 'A']
    for col in numeric_cols:
        data_df[col] = pd.to_numeric(data_df[col], errors='coerce')
    
    # 중복된 세그먼트명(메트릭명) 처리: (2), (3) 같은 번호 추가
    if len(data_df) > 0:
        import re
        # A열의 값들을 문자열로 변환하여 비교
        a_values = data_df['A'].astype(str)
        # 중복 카운트를 위한 딕셔너리
        name_counts = {}
        new_a_values = []
        
        for idx, value in a_values.items():
            # 원본 값 (괄호와 번호 제거)
            clean_value = str(value).strip()
            # 이미 (숫자) 형식이 있으면 제거
            clean_value = re.sub(r'\s*\(\d+\)\s*$', '', clean_value).strip()
            
            # 중복 카운트
            if clean_value not in name_counts:
                name_counts[clean_value] = 0
            
            name_counts[clean_value] += 1
            count = name_counts[clean_value]
            
            # 첫 번째는 그대로, 두 번째부터는 (2), (3) 추가
            if count == 1:
                new_a_values.append(clean_value)
            else:
                new_a_values.append(f"{clean_value} ({count})")
        
        # A열 업데이트
        data_df['A'] = new_a_values
    
    return data_df, segment_names, country, is_multi_country, countries

def detect_countries_from_b_column(df, segments_row):
    """
    B열에서 국가 코드를 감지하여 반환
    B열에 국가 코드가 없으면 None 반환 (단일 국가)
    B열에 국가 코드가 있으면 리스트로 반환 (여러 국가)
    
    여러 국가인 경우, 각 컬럼 쌍(B-C, D-E, F-G, ...)이 국가별로 구성될 수 있음
    """
    common_countries = ['N_AFRICA', 'AFRICA_EN', 'AFRICA_PT', 'AFRICA_FR', 'EG', 'ZA', 'AU', 'CN', 'HK', 'HK_EN', 'TW', 
                       'IN', 'ID', 'JP', 'SEC', 'MY', 'MM', 'NZ', 'PH', 'SG', 'TH', 'VN', 'BD', 'MN', 'AL', 'AT', 'AZ', 
                       'BE', 'BE_FR', 'BG', 'BA', 'HR', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IL', 'IT', 
                       'KZ_KZ', 'KZ_RU', 'LV', 'LT', 'NL', 'NO', 'MK', 'PL', 'PT', 'RO', 'RS', 'SK', 'SI', 'ES', 'SE', 
                       'CH', 'CH_FR', 'TR', 'UA', 'UK', 'UZ_UZ', 'UZ_RU', 'GE', 'AR', 'LATIN_EN', 'LATIN', 'BR', 'CL', 
                       'CO', 'MX', 'PE', 'PY', 'UY', 'PK', 'AE_AR', 'AE', 'IRAN', 'LEVANT', 'LEVANT_AR', 'SA', 'SA_EN', 
                       'IQ_AR', 'IQ_KU', 'KB', 'CA', 'CA_FR', 'US', 'PS']
    
    detected_countries = []
    
    # 세그먼트 이름 행 (segments_row - 2)에서 각 컬럼 확인
    segment_name_row_idx = segments_row - 2
    if segment_name_row_idx >= 0:
        segment_name_row = df.iloc[segment_name_row_idx]
        
        # B열부터 시작하여 Control-Variation 쌍으로 확인 (B-C, D-E, F-G, ...)
        col_idx = 1  # B열은 인덱스 1
        max_cols = min(len(segment_name_row), 50)  # 최대 50개 컬럼까지 확인
        
        while col_idx < max_cols:
            # Control 컬럼 (B, D, F, ...)
            control_col_value = segment_name_row.iloc[col_idx] if col_idx < len(segment_name_row) else None
            
            if pd.notna(control_col_value):
                control_value_str = str(control_col_value).strip().upper()
                
                # 국가 코드인지 확인
                for country_code in common_countries:
                    if (control_value_str == country_code or 
                        country_code in control_value_str or 
                        control_value_str in country_code):
                        if country_code not in detected_countries:
                            detected_countries.append(country_code)
                        break
            
            col_idx += 2  # 다음 Control-Variation 쌍으로 이동
    
    if detected_countries:
        return detected_countries
    
    return None  # B열에 국가 코드가 없음 (단일 국가)

def detect_country_from_excel(df, segments_row):
    """
    Excel 파일에서 Visits 행 하단의 텍스트에서 국가 추출
    """
    # Segments 행 이후 데이터에서 "Visits" 행 찾기
    data_start = segments_row + 1
    visits_row_idx = None
    
    for idx in range(data_start, min(data_start + 100, len(df))):  # 최대 100행까지만 검색
        row = df.iloc[idx]
        if pd.notna(row[0]):
            first_col = str(row[0]).strip().lower()
            if 'visits' in first_col:
                visits_row_idx = idx
                break
    
    # Visits 행 하단에서 국가 추출 (Visits 행 아래 몇 행 확인)
    if visits_row_idx is not None:
        # Site code 리스트
        common_countries = ['N_AFRICA', 'AFRICA_EN', 'AFRICA_PT', 'AFRICA_FR', 'EG', 'ZA', 'AU', 'CN', 'HK', 'HK_EN', 'TW', 
                           'IN', 'ID', 'JP', 'SEC', 'MY', 'MM', 'NZ', 'PH', 'SG', 'TH', 'VN', 'BD', 'MN', 'AL', 'AT', 'AZ', 
                           'BE', 'BE_FR', 'BG', 'BA', 'HR', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IL', 'IT', 
                           'KZ_KZ', 'KZ_RU', 'LV', 'LT', 'NL', 'NO', 'MK', 'PL', 'PT', 'RO', 'RS', 'SK', 'SI', 'ES', 'SE', 
                           'CH', 'CH_FR', 'TR', 'UA', 'UK', 'UZ_UZ', 'UZ_RU', 'GE', 'AR', 'LATIN_EN', 'LATIN', 'BR', 'CL', 
                           'CO', 'MX', 'PE', 'PY', 'UY', 'PK', 'AE_AR', 'AE', 'IRAN', 'LEVANT', 'LEVANT_AR', 'SA', 'SA_EN', 
                           'IQ_AR', 'IQ_KU', 'KB', 'CA', 'CA_FR', 'US', 'PS']
        
        # Visits 행 아래 1-5행 확인
        for check_idx in range(visits_row_idx + 1, min(visits_row_idx + 6, len(df))):
            check_row = df.iloc[check_idx]
            # 첫 번째 컬럼(A열)에서 국가 코드 찾기
            if pd.notna(check_row[0]):
                text = str(check_row[0]).strip().upper()
                # 리스트에서 정확히 일치하는 국가 코드 찾기
                for country_code in common_countries:
                    if text == country_code or country_code in text or text in country_code:
                        return country_code
    
    return 'UK'  # 기본값

def detect_segments_from_user_input(user_segments, variation_count=1):
    """
    사용자가 입력한 세그먼트 목록으로 컬럼 매핑 생성
    user_segments: ['All Visits', 'PC', 'MO', ...] 형식
    variation_count: Variation 개수 (기본값: 1)
    
    variation_count가 1보다 크면:
    - 각 세그먼트마다 Control + Variation들 구조
    - 예: All Visits -> B(Control), C(Var1), D(Var2)
    - 예: PC -> E(Control), F(Var1), G(Var2)
    
    반환 형식: [(segment_name, control_col, variation_col), ...]
    variation_count > 1인 경우: (variation_name, control_col, variation_col, actual_segment_name) 형식
    """
    segments = []
    all_cols = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T']
    
    col_idx = 1  # B열부터 시작
    
    print(f"DEBUG detect_segments_from_user_input: 입력받은 세그먼트 목록: {user_segments}")
    print(f"DEBUG detect_segments_from_user_input: variation_count: {variation_count}")
    
    for segment_name in user_segments:
        if not segment_name or str(segment_name).strip() == '':
            print(f"DEBUG: 빈 세그먼트 건너뜀: '{segment_name}'")
            continue
        
        segment_name = str(segment_name).strip()
        print(f"DEBUG: 세그먼트 처리 중: '{segment_name}', 현재 col_idx: {col_idx}")
        
        if variation_count > 1:
            # 여러 Variation인 경우: Control + Variation들
            control_col = all_cols[col_idx]
            col_idx += 1
            
            # 각 Variation별로 Control과 비교
            # 실제 세그먼트 이름을 저장하기 위해 4개 요소 튜플 사용
            for var_idx in range(1, variation_count + 1):
                if col_idx >= len(all_cols):
                    print(f"경고: 컬럼 범위를 초과했습니다. 세그먼트 '{segment_name}'의 Variation {var_idx}를 건너뜁니다.")
                    break
                variation_col = all_cols[col_idx]
                variation_name = f'Variation {var_idx}'
                # (variation_name, control_col, variation_col, actual_segment_name) 형식
                segments.append((variation_name, control_col, variation_col, segment_name))
                col_idx += 1
                print(f"DEBUG detect_segments_from_user_input: {segment_name} - {variation_name} (Control: {control_col}, Variation: {variation_col})")
        else:
            # variation_count = 1인 경우: Control-Variation 쌍
            if col_idx + 1 >= len(all_cols):
                print(f"경고: 컬럼 범위를 초과했습니다. 세그먼트 '{segment_name}'를 건너뜁니다.")
                break
            control_col = all_cols[col_idx]
            variation_col = all_cols[col_idx + 1]
            segments.append((segment_name, control_col, variation_col))
            col_idx += 2
            print(f"DEBUG detect_segments_from_user_input: {segment_name} (Control: {control_col}, Variation: {variation_col})")
    
    print(f"DEBUG detect_segments_from_user_input: 총 {len(segments)}개 세그먼트 매핑 생성됨")
    return segments

def detect_segments(segment_names, variation_count=1):
    """
    세그먼트 컬럼 매핑을 동적으로 감지
    segment_names: {'B': 'All', 'C': 'All', 'D': '세그먼트 1', 'E': '세그먼트 1', ...} 형식
    variation_count: Variation 개수 (기본값: 1)
    
    variation_count가 1보다 크면:
    - B열: Control
    - C열: Variation 1
    - D열: Variation 2
    - ...
    각 Variation은 Control과 비교
    """
    segments = []
    used_cols = set()
    all_cols = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T']
    
    if variation_count > 1:
        # 여러 Variation인 경우: B열이 Control, C부터 Variation들
        segment_name = segment_names.get('B', 'All') if segment_names else 'All'
        control_col = 'B'
        
        # 각 Variation별로 Control과 비교
        for var_idx in range(1, variation_count + 1):
            variation_col_idx = 1 + var_idx  # C=2, D=3, E=4, ...
            if variation_col_idx < len(all_cols):
                variation_col = all_cols[variation_col_idx]
                variation_name = f'Variation {var_idx}'
                segments.append((variation_name, control_col, variation_col))
                used_cols.add(control_col)
                used_cols.add(variation_col)
                print(f"DEBUG detect_segments: Variation {var_idx} 추가 - {variation_name} (Control: {control_col}, Variation: {variation_col})")
    else:
        # 기존 방식: Control-Variation 쌍 (B-C, D-E, F-G, ...)
        # B-C는 All (segment_names에서 읽은 값 사용)
        if 'B' in segment_names and 'C' in segment_names:
            segment_name_bc = segment_names['B'] if segment_names['B'] else 'All'
            segments.append((segment_name_bc, 'B', 'C'))
            used_cols.add('B')
            used_cols.add('C')
            print(f"DEBUG detect_segments: 첫 번째 세그먼트 추가 - {segment_name_bc} (B-C)")
        
        # 나머지는 Control/Variation 쌍으로 처리 (D-E, F-G, H-I, ...)
        # D부터 시작하여 Control/Variation 쌍 검색
        for i in range(3, len(all_cols) - 1, 2):  # D=3부터 시작, 2씩 증가 (D-E, F-G, H-I, ...)
            control_col = all_cols[i]
            variation_col = all_cols[i + 1]
            
            # segment_names에 해당 컬럼이 있는지 확인
            if control_col in segment_names or variation_col in segment_names:
                # 세그먼트 이름 추출 (Control 또는 Variation 중 하나라도 있으면 사용)
                segment_name = None
                if control_col in segment_names:
                    segment_name = str(segment_names[control_col]).strip()
                elif variation_col in segment_names:
                    segment_name = str(segment_names[variation_col]).strip()
                
                if segment_name and segment_name.lower() not in ['nan', 'none', '']:
                    segments.append((segment_name, control_col, variation_col))
                    used_cols.add(control_col)
                    used_cols.add(variation_col)
                    print(f"DEBUG detect_segments: 세그먼트 추가 - {segment_name} ({control_col}-{variation_col})")
        
        # 매칭되지 않은 경우 기본값 사용
        if not segments:
            print("경고: 세그먼트를 자동 감지하지 못했습니다. 기본 구조를 사용합니다.")
            segment_name_bc = segment_names.get('B', 'All') if segment_names else 'All'
            segments.append((segment_name_bc, 'B', 'C'))
            if 'D' in segment_names and 'E' in segment_names:
                segments.append(('세그먼트 1', 'D', 'E'))
            if 'F' in segment_names and 'G' in segment_names:
                segments.append(('세그먼트 2', 'F', 'G'))
    
    print(f"DEBUG detect_segments: 총 {len(segments)}개 세그먼트 감지됨")
    return segments

def clean_label(label):
    """라벨 정리 (공백, 언더스코어, 특수문자 제거)"""
    if pd.isna(label):
        return ''
    # 언더스코어, 공백, 특수문자 제거하여 매칭 정확도 향상
    cleaned = str(label).strip().replace('_', '').replace(' ', '').replace('>', '').replace('-', '').replace('(', '').replace(')', '')
    return cleaned

def compute_confidence_rate(xC, nC, xV, nV):
    """
    비율에 대한 신뢰도 계산 (two-sided z-test, unpooled)
    """
    if nC == 0 or nV == 0:
        return None, 0.0
    
    pC = xC / nC if nC > 0 else 0
    pV = xV / nV if nV > 0 else 0
    
    # 분산이 0인 경우
    if pC == 0 and pV == 0:
        return None, 0.0
    
    # Unpooled standard error
    se = np.sqrt((pV * (1 - pV) / nV) + (pC * (1 - pC) / nC))
    
    if se == 0:
        return None, 0.0
    
    # z-score
    z = (pV - pC) / se
    
    # p-value (two-sided)
    p_value = 2 * (1 - norm.cdf(abs(z)))
    
    # Confidence level
    confidence = (1 - p_value) * 100
    
    # NaN 체크
    if np.isnan(confidence) or np.isinf(confidence):
        return None, None
    
    return pC, confidence

def compute_verdict(uplift, num_c, num_v, confidence=None):
    """
    Verdict 계산 (Excel 수식 기반)
    샘플 크기는 분자(numerator) 기준으로 판단
    - num_c < 100 OR num_v < 100 => 모수 부족
    - num_c >= 100 AND num_v >= 100 AND confidence >= 95% AND uplift >= 3% => Variation 우세
    - num_c >= 100 AND num_v >= 100 AND confidence >= 95% AND uplift <= -3% => Control 우세
    - num_c >= 100 AND num_v >= 100 AND confidence >= 90% AND confidence < 95% AND uplift >= 3% => Variation 우세 (유보)
    - num_c >= 100 AND num_v >= 100 AND confidence >= 90% AND confidence < 95% AND uplift <= -3% => Control 우세 (유보)
    - else => 차이 없음
    """
    # Control 또는 Variation 분자 샘플 크기가 100 미만이면 모수 부족
    if num_c < 100 or num_v < 100:
        return '모수 부족'
    
    # 신뢰도가 없으면 차이 없음
    if confidence is None:
        return '차이 없음'
    
    # 신뢰도 95% 이상
    if confidence >= 95.0:
        if uplift >= 3.0:
            return 'Variation 우세'
        elif uplift <= -3.0:
            return 'Control 우세'
    
    # 신뢰도 90% 이상 95% 미만
    elif confidence >= 90.0:
        if uplift >= 3.0:
            return 'Variation 우세 (유보)'
        elif uplift <= -3.0:
            return 'Control 우세 (유보)'
    
    # 그 외 (신뢰도 90% 미만)
    return '차이 없음'

def find_metric_value(data_df, metric_label, country, device_col, debug=False):
    """
    특정 메트릭 값 찾기
    device_col: 'B' (All Control), 'C' (All Variation), 'D' (세그먼트1 Control), etc.
    
    Excel 구조:
    - 컬럼 A: 메트릭 이름 (세그먼트 이름)
    - 컬럼 B: All Visits - Control
    - 컬럼 C: All Visits - Variation
    - 컬럼 D: 세그먼트 1 - Control
    - 컬럼 E: 세그먼트 1 - Variation
    - ...
    """
    metric_clean = clean_label(metric_label)
    
    # 컬럼 A(메트릭 이름)로 필터링
    filtered = data_df[
        data_df['A'].apply(clean_label).str.contains(metric_clean, case=False, na=False, regex=False)
    ]
    
    # 정확한 매칭이 실패하면, 메트릭 이름의 핵심 부분만 추출하여 재시도
    if filtered.empty:
        # 메트릭 이름에서 핵심 키워드 추출
        # 예: "(Cart 2) Cart add_25 Series (Visitor)" -> "CartaddSeries" 또는 "Cartadd"
        import re
        # 괄호, 숫자, 특수문자 제거 후 핵심 단어 추출
        core_text = re.sub(r'[0-9_()>]', '', metric_label).strip()
        # 공백 제거하여 단어 연결
        core_words = ''.join(core_text.split())
        core_words_clean = clean_label(core_words)
        
        if core_words_clean and len(core_words_clean) > 5:  # 최소 길이 체크
            # 핵심 단어로 재시도
            filtered = data_df[
                data_df['A'].apply(clean_label).str.contains(core_words_clean, case=False, na=False, regex=False)
            ]
            
            if debug and not filtered.empty:
                print(f"DEBUG: 핵심 단어로 메트릭 찾음 - core_words: {core_words_clean}, 원본: {metric_label}")
        
        # 여전히 찾지 못하면, "Cart"와 "add" 같은 핵심 키워드로 재시도
        if filtered.empty:
            keywords = re.findall(r'\b\w+\b', metric_label.lower())
            # "cart", "add" 같은 핵심 키워드 추출
            important_keywords = [kw for kw in keywords if len(kw) > 3 and kw not in ['cart', 'series', 'visitor']]
            if 'cart' in keywords and 'add' in keywords:
                # "cartadd"로 검색
                cartadd_clean = clean_label('cart add')
                filtered = data_df[
                    data_df['A'].apply(clean_label).str.contains(cartadd_clean, case=False, na=False, regex=False)
                ]
                if debug and not filtered.empty:
                    print(f"DEBUG: 'cart add' 키워드로 메트릭 찾음 - 원본: {metric_label}")
    
    if filtered.empty:
        if debug:
            print(f"DEBUG: 메트릭을 찾을 수 없음 - metric: {metric_label}, device_col: {device_col}")
            print(f"  정리된 메트릭: {metric_clean}")
            # 사용 가능한 메트릭 샘플 출력
            if len(data_df) > 0:
                sample_metrics = data_df['A'].dropna().unique()[:10]
                print(f"  컬럼 A 메트릭 샘플: {list(sample_metrics)}")
                # 유사한 메트릭 찾기 시도
                metric_lower = metric_label.lower()
                similar_metrics = [m for m in sample_metrics if 'cart' in str(m).lower() and 'add' in str(m).lower()]
                if similar_metrics:
                    print(f"  유사한 메트릭 (Cart + Add 포함): {similar_metrics}")
        return None
    
    # 첫 번째 매칭 행의 해당 컬럼 값
    value = filtered.iloc[0][device_col]
    
    if debug:
        print(f"DEBUG: 메트릭 찾음 - country: {country}, metric: {metric_label}, device_col: {device_col}")
        print(f"  매칭된 행: A={filtered.iloc[0]['A']}, B={filtered.iloc[0]['B']}, C={filtered.iloc[0]['C']}")
        print(f"  원본 값: {value}, 타입: {type(value)}")
    
    try:
        # 숫자로 변환 시도
        if pd.isna(value):
            if debug:
                print(f"  값이 NaN입니다.")
            return None
        
        # 문자열인 경우 쉼표 제거 후 숫자 변환 시도
        if isinstance(value, str):
            # 쉼표와 공백 제거
            value_clean = value.replace(',', '').replace(' ', '').strip()
            if value_clean == '' or value_clean.lower() in ['nan', 'none', '-', 'n/a']:
                return None
            result = float(value_clean)
        else:
            result = float(value)
        
        if debug:
            print(f"  변환된 값: {result}")
        
        return result
    except (ValueError, TypeError) as e:
        if debug:
            print(f"DEBUG: 값 변환 실패 - {e}, value: {value}, type: {type(value)}")
        return None

def detect_country(data_df):
    """
    데이터에서 국가 자동 감지 (사용되지 않음 - detect_country_from_excel 사용)
    """
    return 'UK'  # 기본값

def compute_kpi(data_df, kpi_config, country='UK', segment_mapping=None, variation_count=1, debug=False, report_order=None):
    """
    KPI 계산
    segment_mapping: [('Segment Name', 'Control Col', 'Variation Col'), ...] 형식
    variation_count: Variation 개수 (기본값: 1)
    report_order: 리포트 순서 (메트릭을 찾지 못한 경우 에러 메시지에 포함)
    """
    results = []
    missing_metrics = []  # 찾지 못한 메트릭 정보 저장
    
    # 세그먼트 매핑이 제공되지 않으면 기본값 사용
    if segment_mapping:
        segments = segment_mapping
    else:
        # data_df에서 세그먼트 정보 가져오기
        segment_names = getattr(data_df, 'attrs', {}).get('segment_names', {})
        if segment_names:
            segments = detect_segments(segment_names, variation_count)
        else:
            segments = [
                ('All', 'B', 'C'),
            ]
    
    # variation_count > 1인 경우, segment별로 그룹화
    if variation_count > 1:
        # segment별로 variation 결과를 그룹화
        segment_groups = {}
        base_segment_name = None
        
        for seg_info in segments:
            # segments가 4개 요소를 가질 수 있음 (variation_count > 1인 경우)
            if len(seg_info) == 4:
                segment_name, control_col, variation_col, actual_segment_name = seg_info
                base_segment_name = actual_segment_name
            else:
                segment_name, control_col, variation_col = seg_info
                # segment_name이 실제 세그먼트 이름 (사용자가 입력한 세그먼트)
                base_segment_name = segment_name
                # 빈 문자열이나 None이면 'All' 사용
                if not base_segment_name or base_segment_name.strip() == '' or base_segment_name.lower() in ['nan', 'none']:
                    base_segment_name = 'All'
            
            if base_segment_name not in segment_groups:
                segment_groups[base_segment_name] = {
                    'segment_name': base_segment_name,
                    'control_col': control_col,
                    'variations': []
                }
            
            # Variation 정보 추출
            variation_num = None
            if 'Variation' in segment_name:
                try:
                    variation_num = int(segment_name.split()[-1])
                except:
                    variation_num = len(segment_groups[base_segment_name]['variations']) + 1
            
            segment_groups[base_segment_name]['variations'].append({
                'variation_num': variation_num,
                'variation_col': variation_col,
                'segment_name': segment_name
            })
        
        # 각 segment별로 하나의 결과 객체 생성
        for base_segment_name, group_data in segment_groups.items():
            control_col = group_data['control_col']
            variations = sorted(group_data['variations'], key=lambda x: x['variation_num'] or 0)
            
            # Control 값 계산
            if kpi_config['type'] == 'rate' or kpi_config['type'] == 'simple':
                if debug:
                    print(f"DEBUG compute_kpi (variation_count > 1): KPI={kpi_config['name']}, segment={base_segment_name}, control_col={control_col}")
                    print(f"  numerator={kpi_config['numerator']}, denominator={kpi_config.get('denominator', '')}")
                
                num_c = find_metric_value(data_df, kpi_config['numerator'], None, control_col, debug)
                
                # denominator가 있으면 rate 계산, 없으면 값만 사용
                den_label = kpi_config.get('denominator', '')
                if den_label and den_label.strip():
                    den_c = find_metric_value(data_df, kpi_config['denominator'], None, control_col, debug)
                else:
                    den_c = None
                
                if debug:
                    print(f"  Control 값: num_c={num_c}, den_c={den_c}")
                
                if num_c is None:
                    if debug:
                        print(f"  경고: Control 값이 None입니다. 건너뜁니다.")
                    missing_metrics.append({
                        'metric': kpi_config['numerator'],
                        'segment': base_segment_name,
                        'country': country,
                        'reportOrder': report_order
                    })
                    continue
                
                # denominator가 있으면 rate 계산, 없으면 None
                if den_c is not None and den_c > 0:
                    rate_c = num_c / den_c
                else:
                    rate_c = None
                
                # 각 Variation별로 계산
                variation_data = []
                for var_info in variations:
                    variation_col = var_info['variation_col']
                    variation_num = var_info['variation_num']
                    
                    if debug:
                        print(f"  Variation {variation_num} 처리: variation_col={variation_col}")
                    
                    num_v = find_metric_value(data_df, kpi_config['numerator'], None, variation_col, debug)
                    
                    # denominator가 있으면 rate 계산, 없으면 값만 사용
                    if den_label and den_label.strip():
                        den_v = find_metric_value(data_df, kpi_config['denominator'], None, variation_col, debug)
                    else:
                        den_v = None
                    
                    if debug:
                        print(f"    Variation {variation_num} 값: num_v={num_v}, den_v={den_v}")
                    
                    if num_v is None:
                        if debug:
                            print(f"    경고: Variation {variation_num} 값이 None입니다. 건너뜁니다.")
                        continue
                    
                    # denominator가 있으면 rate 계산, 없으면 None
                    if den_v is not None and den_v > 0:
                        rate_v = num_v / den_v
                    else:
                        rate_v = None
                    
                    # uplift 계산
                    if rate_c is not None and rate_v is not None:
                        uplift = ((rate_v - rate_c) / rate_c * 100) if rate_c > 0 else 0
                        pC, confidence = compute_confidence_rate(num_c, den_c, num_v, den_v)
                        verdict = compute_verdict(uplift, num_c, num_v, confidence)
                    else:
                        # denominator가 없으면 값만 비교
                        uplift = ((num_v - num_c) / num_c * 100) if num_c > 0 else 0
                        confidence = None
                        verdict = compute_verdict(uplift, num_c, num_v, confidence=None)
                    
                    variation_data.append({
                        'variationNum': var_info['variation_num'],
                        'variationRate': rate_v,
                        'uplift': uplift,
                        'confidence': confidence,
                        'verdict': verdict,
                        'controlValue': num_c,
                        'variationValue': num_v,
                        'denominatorSizeControl': den_c if den_c is not None else 0,
                        'denominatorSizeVariation': den_v if den_v is not None else 0,
                    })
                
                if variation_data:
                    results.append({
                        'country': country or 'N/A',
                        'device': base_segment_name,
                        'kpiName': kpi_config['name'],
                        'controlRate': rate_c,
                        'controlValue': num_c,
                        'denominatorSizeControl': den_c if den_c is not None else 0,
                        'variations': variation_data,
                    })
            elif kpi_config['type'] == 'revenue':
                rev_c = find_metric_value(data_df, kpi_config.get('numerator', 'Revenue'), None, control_col, debug)
                
                if rev_c is None:
                    # 메트릭을 찾지 못한 경우 정보 저장
                    missing_metrics.append({
                        'metric': kpi_config.get('numerator', 'Revenue'),
                        'segment': base_segment_name,
                        'country': country,
                        'reportOrder': report_order
                    })
                    continue
                
                variation_data = []
                for var_info in variations:
                    variation_col = var_info['variation_col']
                    rev_v = find_metric_value(data_df, kpi_config.get('numerator', 'Revenue'), None, variation_col, debug)
                    
                    if rev_v is None:
                        continue
                    
                    uplift = ((rev_v - rev_c) / rev_c * 100) if rev_c > 0 else 0
                    verdict = compute_verdict(uplift, rev_c, rev_v, confidence=None)
                    
                    variation_data.append({
                        'variationNum': var_info['variation_num'],
                        'variationValue': rev_v,
                        'uplift': uplift,
                        'confidence': None,
                        'verdict': verdict,
                        'controlValue': rev_c,
                    })
                
                if variation_data:
                    results.append({
                        'country': country or 'N/A',
                        'device': base_segment_name or 'All',
                        'kpiName': kpi_config['name'],
                        'controlValue': rev_c,
                        'variations': variation_data,
                    })
            elif kpi_config['type'] == 'variation_only':
                # Variation Only: Variation 값만 계산, uplift 계산 안 함
                metric_label = kpi_config.get('numerator', '')
                den_label = kpi_config.get('denominator', '')
                
                variation_data = []
                for var_info in variations:
                    variation_col = var_info['variation_col']
                    variation_num = var_info['variation_num']
                    
                    val_v = find_metric_value(data_df, metric_label, None, variation_col, debug)
                    
                    if val_v is None:
                        continue
                    
                    # Denominator가 있으면 rate 계산, 없으면 값만 사용
                    rate_v = None
                    den_v = None
                    if den_label and den_label.strip():
                        den_v = find_metric_value(data_df, den_label, None, variation_col, debug)
                        if den_v is not None and den_v > 0:
                            rate_v = val_v / den_v
                    
                    variation_data.append({
                        'variationNum': variation_num,
                        'variationValue': val_v,
                        'variationRate': rate_v,
                        'uplift': None,  # Uplift 계산 안 함
                        'confidence': None,  # Confidence 계산 안 함
                        'verdict': None,  # Verdict 계산 안 함
                        'denominatorSizeVariation': den_v if den_v is not None else 0,
                    })
                
                if variation_data:
                    results.append({
                        'country': country or 'N/A',
                        'device': base_segment_name or 'All',
                        'kpiName': kpi_config['name'],
                        'controlValue': None,  # Control 값 없음
                        'controlRate': None,  # Control rate 없음
                        'variations': variation_data,
                    })
            elif kpi_config['type'] == 'rpv':
                rev_c = find_metric_value(data_df, 'Revenue', None, control_col, debug)
                visits_c = find_metric_value(data_df, 'Visits', None, control_col, debug)
                
                if rev_c is None or visits_c is None:
                    continue
                
                rpv_c = rev_c / visits_c if visits_c > 0 else 0
                
                variation_data = []
                for var_info in variations:
                    variation_col = var_info['variation_col']
                    rev_v = find_metric_value(data_df, 'Revenue', None, variation_col, debug)
                    visits_v = find_metric_value(data_df, 'Visits', None, variation_col, debug)
                    
                    if rev_v is None or visits_v is None:
                        # 메트릭을 찾지 못한 경우 정보 저장
                        if rev_v is None:
                            missing_metrics.append({
                                'metric': 'Revenue',
                                'segment': base_segment_name,
                                'country': country,
                                'reportOrder': report_order
                            })
                        if visits_v is None:
                            missing_metrics.append({
                                'metric': 'Visits',
                                'segment': base_segment_name,
                                'country': country,
                                'reportOrder': report_order
                            })
                        continue
                    
                    rpv_v = rev_v / visits_v if visits_v > 0 else 0
                    uplift = ((rpv_v - rpv_c) / rpv_c * 100) if rpv_c > 0 else 0
                    pC, confidence = compute_confidence_rate(rev_c, visits_c, rev_v, visits_v)
                    verdict = compute_verdict(uplift, rev_c, rev_v, confidence)
                    
                    variation_data.append({
                        'variationNum': var_info['variation_num'],
                        'variationRate': rpv_v,
                        'uplift': uplift,
                        'confidence': confidence,
                        'verdict': verdict,
                        'controlValue': rev_c,
                        'variationValue': rev_v,
                    })
                
                if variation_data:
                    results.append({
                        'country': country or 'N/A',
                        'device': base_segment_name,
                        'kpiName': kpi_config['name'],
                        'controlRate': rpv_c,
                        'controlValue': rev_c,
                        'variations': variation_data,
                    })
    else:
        # 기존 로직: variation_count = 1
        for seg_info in segments:
            # segments가 4개 요소를 가질 수 있음 (variation_count > 1인 경우 사용자 입력 세그먼트 사용)
            if len(seg_info) == 4:
                segment_name, control_col, variation_col, actual_segment_name = seg_info
                # actual_segment_name이 사용자가 입력한 세그먼트 이름
                display_segment_name = actual_segment_name
            else:
                segment_name, control_col, variation_col = seg_info
                # segment_name이 사용자가 입력한 세그먼트 이름 (detect_segments_from_user_input에서 반환)
                display_segment_name = segment_name
            
            if kpi_config['type'] == 'rate' or kpi_config['type'] == 'simple':
                # Rate KPI: numerator / denominator
                # Simple 타입도 rate와 동일하게 처리 (denominator는 선택사항)
                # country 파라미터는 실제로 사용되지 않음 (새 구조에서는 국가 컬럼 없음)
                num_c = find_metric_value(data_df, kpi_config['numerator'], None, control_col, debug)
                num_v = find_metric_value(data_df, kpi_config['numerator'], None, variation_col, debug)
                
                # denominator가 있으면 rate 계산, 없으면 값만 사용
                den_label = kpi_config.get('denominator', '')
                if den_label and den_label.strip():
                    den_c = find_metric_value(data_df, kpi_config['denominator'], None, control_col, debug)
                    den_v = find_metric_value(data_df, kpi_config['denominator'], None, variation_col, debug)
                else:
                    den_c = None
                    den_v = None
            
                if num_c is None or num_v is None:
                    if debug:
                        print(f"DEBUG: KPI 계산 실패 - {kpi_config['name']}, segment: {segment_name}")
                        print(f"  num_c: {num_c}, num_v: {num_v}, den_c: {den_c}, den_v: {den_v}")
                        # 메트릭을 찾지 못한 경우 정보 저장
                        if num_c is None:
                            missing_metrics.append({
                                'metric': kpi_config['numerator'],
                                'segment': display_segment_name,
                                'country': country,
                                'reportOrder': report_order
                            })
                        if num_v is None:
                            missing_metrics.append({
                                'metric': kpi_config['numerator'],
                                'segment': display_segment_name,
                                'country': country,
                                'reportOrder': report_order
                            })
                        # denominator가 있는 경우에만 missing 체크
                        if den_label and den_label.strip():
                            if den_c is None:
                                missing_metrics.append({
                                    'metric': kpi_config['denominator'],
                                    'segment': display_segment_name,
                                    'country': country,
                                    'reportOrder': report_order
                                })
                            if den_v is None:
                                missing_metrics.append({
                                    'metric': kpi_config['denominator'],
                                    'segment': display_segment_name,
                                    'country': country,
                                    'reportOrder': report_order
                                })
                    continue
            
            # 디버그: 실제 값 출력
            if debug:
                print(f"DEBUG: KPI 계산 - {kpi_config['name']}, segment: {segment_name}")
                print(f"  numerator: {kpi_config['numerator']}, denominator: {kpi_config.get('denominator', '')}")
                print(f"  num_c: {num_c}, num_v: {num_v}, den_c: {den_c}, den_v: {den_v}")
            
                # denominator가 있으면 rate 계산, 없으면 값만 사용
                if den_c is not None and den_v is not None and den_c > 0 and den_v > 0:
                    rate_c = num_c / den_c
                    rate_v = num_v / den_v
                    uplift = ((rate_v - rate_c) / rate_c * 100) if rate_c > 0 else 0
                    pC, confidence = compute_confidence_rate(num_c, den_c, num_v, den_v)
                    verdict = compute_verdict(uplift, num_c, num_v, confidence)
                else:
                    # denominator가 없으면 값만 사용 (simple 타입)
                    rate_c = None
                    rate_v = None
                    uplift = ((num_v - num_c) / num_c * 100) if num_c > 0 else 0
                    confidence = None
                    verdict = compute_verdict(uplift, num_c, num_v, confidence=None)
                
                if debug:
                    print(f"  rate_c: {rate_c}, rate_v: {rate_v}, uplift: {uplift}")
                
                results.append({
                    'country': country or 'N/A',  # 국가 정보가 없을 수 있음
                    'device': display_segment_name or 'All',  # 사용자가 입력한 세그먼트 이름 사용
                    'kpiName': kpi_config['name'],
                    'controlValue': num_c,
                    'variationValue': num_v,
                    'controlRate': rate_c,
                    'variationRate': rate_v,
                    'uplift': uplift,
                    'confidence': confidence,
                    'verdict': verdict,
                    'denominatorSize': (den_c + den_v) if (den_c is not None and den_v is not None) else 0,
                    'denominatorSizeControl': den_c if den_c is not None else 0,
                    'denominatorSizeVariation': den_v if den_v is not None else 0,
                })
            
            elif kpi_config['type'] == 'variation_only':
                # Variation Only: Variation 값만 계산, uplift 계산 안 함
                metric_label = kpi_config.get('numerator', '')
                den_label = kpi_config.get('denominator', '')
                
                # Variation 값만 추출
                val_v = find_metric_value(data_df, metric_label, None, variation_col, debug)
                
                if val_v is None:
                    if debug:
                        print(f"DEBUG: Variation Only KPI 계산 실패 - {kpi_config['name']}, segment: {segment_name}")
                    missing_metrics.append({
                        'metric': metric_label,
                        'segment': display_segment_name,
                        'country': country,
                        'reportOrder': report_order
                    })
                    continue
                
                # Denominator가 있으면 rate 계산, 없으면 값만 사용
                rate_v = None
                den_v = None
                if den_label and den_label.strip():
                    den_v = find_metric_value(data_df, den_label, None, variation_col, debug)
                    if den_v is not None and den_v > 0:
                        rate_v = val_v / den_v
                
                # Variation Only는 uplift 계산 안 함
                results.append({
                    'country': country or 'N/A',
                    'device': display_segment_name or 'All',
                    'kpiName': kpi_config['name'],
                    'controlValue': None,  # Control 값 없음
                    'variationValue': val_v,
                    'controlRate': None,  # Control rate 없음
                    'variationRate': rate_v,  # Denominator가 있으면 rate, 없으면 None
                    'uplift': None,  # Uplift 계산 안 함
                    'confidence': None,  # Confidence 계산 안 함
                    'verdict': None,  # Verdict 계산 안 함
                    'denominatorSize': den_v if den_v is not None else 0,
                    'denominatorSizeControl': 0,
                    'denominatorSizeVariation': den_v if den_v is not None else 0,
                })
            
            elif kpi_config['type'] == 'revenue':
                # Revenue: numerator 값 사용
                metric_label = kpi_config.get('numerator', 'Revenue')
                rev_c = find_metric_value(data_df, metric_label, None, control_col, debug)
                rev_v = find_metric_value(data_df, metric_label, None, variation_col, debug)
                
                if rev_c is None or rev_v is None:
                    if debug:
                        print(f"DEBUG: Revenue KPI 계산 실패 - {kpi_config['name']}, segment: {segment_name}")
                        # 메트릭을 찾지 못한 경우 정보 저장
                        if rev_c is None or rev_v is None:
                            missing_metrics.append({
                                'metric': metric_label,
                                'segment': display_segment_name,
                                'country': country,
                                'reportOrder': report_order
                            })
                    continue
                
                uplift = ((rev_v - rev_c) / rev_c * 100) if rev_c > 0 else 0
                
                # Revenue는 variance 데이터가 없으므로 confidence 계산 불가
                # 샘플 크기는 Revenue 값 자체(분자)를 기준으로 판단
                rev_c = rev_c or 0
                rev_v = rev_v or 0
                
                # Revenue는 confidence가 없으므로 None 전달
                # 샘플 크기는 Revenue 값(분자) 기준
                verdict = compute_verdict(uplift, rev_c, rev_v, confidence=None)
                
                results.append({
                    'country': country or 'N/A',  # 국가 정보가 없을 수 있음
                    'device': display_segment_name or 'All',  # 사용자가 입력한 세그먼트 이름 사용
                    'kpiName': kpi_config['name'],
                    'controlValue': rev_c,
                    'variationValue': rev_v,
                    'controlRate': None,
                    'variationRate': None,
                    'uplift': uplift,
                    'confidence': None,
                    'verdict': verdict,
                    'denominatorSize': rev_c + rev_v,  # Revenue는 값 자체가 샘플 크기
                    'denominatorSizeControl': rev_c,
                    'denominatorSizeVariation': rev_v,
                })
            
            elif kpi_config['type'] == 'rpv':
                # RPV: Revenue / Visits
                rev_c = find_metric_value(data_df, 'Revenue', None, control_col, debug)
                rev_v = find_metric_value(data_df, 'Revenue', None, variation_col, debug)
                visits_c = find_metric_value(data_df, 'Visits', None, control_col, debug)
                visits_v = find_metric_value(data_df, 'Visits', None, variation_col, debug)
                
                if rev_c is None or rev_v is None or visits_c is None or visits_v is None:
                    if debug:
                        print(f"DEBUG: RPV KPI 계산 실패 - {kpi_config['name']}, segment: {segment_name}")
                        # 메트릭을 찾지 못한 경우 정보 저장
                        if rev_c is None or rev_v is None:
                            missing_metrics.append({
                                'metric': 'Revenue',
                                'segment': display_segment_name,
                                'country': country,
                                'reportOrder': report_order
                            })
                        if visits_c is None or visits_v is None:
                            missing_metrics.append({
                                'metric': 'Visits',
                                'segment': display_segment_name,
                                'country': country,
                                'reportOrder': report_order
                            })
                    continue
                
                rpv_c = rev_c / visits_c if visits_c > 0 else 0
                rpv_v = rev_v / visits_v if visits_v > 0 else 0
                
                uplift = ((rpv_v - rpv_c) / rpv_c * 100) if rpv_c > 0 else 0
                
                # RPV는 revenue와 visits의 비율이므로 confidence 계산 복잡
                # 간단히 visits를 기준으로 계산
                pC, confidence = compute_confidence_rate(rev_c, visits_c, rev_v, visits_v)
                
                # 샘플 크기는 Revenue 값(분자) 기준
                verdict = compute_verdict(uplift, rev_c, rev_v, confidence)
                
                results.append({
                    'country': country or 'N/A',  # 국가 정보가 없을 수 있음
                    'device': display_segment_name or 'All',  # 사용자가 입력한 세그먼트 이름 사용
                    'kpiName': kpi_config['name'],
                    'controlValue': rev_c,
                    'variationValue': rev_v,
                    'controlRate': rpv_c,
                    'variationRate': rpv_v,
                    'uplift': uplift,
                    'confidence': confidence,
                    'verdict': verdict,
                    'denominatorSize': visits_c + visits_v,
                })
    
    return results, missing_metrics

def compute_secondary_kpi(data_df, kpi_label, country='UK', segment_mapping=None, debug=False):
    """Secondary KPI 계산 (단순 메트릭) - 사용되지 않음"""
    results = []
    missing_metrics = []  # 사용되지 않지만 반환 형식 일치를 위해
    
    # 세그먼트 매핑이 제공되지 않으면 기본값 사용
    if segment_mapping:
        segments = segment_mapping
    else:
        segment_names = getattr(data_df, 'attrs', {}).get('segment_names', {})
        variation_count = 1  # 기본값
        if segment_names:
            segments = detect_segments(segment_names, variation_count)
        else:
            # 기본 구조: B-C (All)
            segments = [
                ('All', 'B', 'C'),
            ]
    
    for seg_info in segments:
        # segments가 4개 요소를 가질 수 있음 (variation_count > 1인 경우 사용자 입력 세그먼트 사용)
        if len(seg_info) == 4:
            segment_name, control_col, variation_col, actual_segment_name = seg_info
        else:
            segment_name, control_col, variation_col = seg_info
        
        val_c = find_metric_value(data_df, kpi_label, None, control_col, debug)
        val_v = find_metric_value(data_df, kpi_label, None, variation_col, debug)
        
        if val_c is None or val_v is None:
            if debug:
                print(f"DEBUG: Secondary KPI 계산 실패 - {kpi_label}, segment: {segment_name}")
            continue
        
        uplift = ((val_v - val_c) / val_c * 100) if val_c > 0 else 0
        
        # Secondary KPI는 샘플 크기를 값 자체(분자) 기준으로 판단
        val_c = val_c or 0
        val_v = val_v or 0
        
        # Secondary KPI는 confidence 계산하지 않으므로 None 전달
        # 샘플 크기는 값 자체(분자) 기준
        verdict = compute_verdict(uplift, val_c, val_v, confidence=None)
        
        # denominator는 visits로 계산 (표시용)
        visits_c = find_metric_value(data_df, 'Visits', None, control_col, debug)
        visits_v = find_metric_value(data_df, 'Visits', None, variation_col, debug)
        visits_c = visits_c or 0
        visits_v = visits_v or 0
        denominator_size = visits_c + visits_v
        
        # 사용자가 입력한 세그먼트 이름 추출
        if len(seg_info) == 4:
            _, _, _, actual_segment_name = seg_info
            display_segment_name = actual_segment_name
        else:
            display_segment_name = segment_name
        
        results.append({
            'country': country or 'N/A',  # 국가 정보가 없을 수 있음
            'device': display_segment_name or 'All',  # 사용자가 입력한 세그먼트 이름 사용
            'kpiName': kpi_label,
            'controlValue': val_c,
            'variationValue': val_v,
            'controlRate': None,
            'variationRate': None,
            'uplift': uplift,
            'confidence': None,  # Secondary는 간단히 표시만
            'verdict': verdict,
            'denominatorSize': denominator_size,
            'denominatorSizeControl': visits_c,
            'denominatorSizeVariation': visits_v,
        })
    
    return results, missing_metrics

def compute_secondary_kpi(data_df, kpi_label, country='UK', segment_mapping=None, debug=False):
    """Secondary KPI 계산 (단순 메트릭) - 사용되지 않음"""
    results = []
    return results, []  # missing_metrics는 빈 리스트로 반환

def generate_insights(primary_results, use_ai=False):
    """인사이트 생성
    
    Args:
        primary_results: KPI 결과 리스트
        use_ai: AI를 사용하여 추가 인사이트 생성 여부 (기본값: False)
    """
    insights = {
        'summary': [],
        'recommendation': None,
    }
    
    # Primary KPI 분석
    primary_wins = 0
    primary_losses = 0
    primary_no_diff = 0
    primary_reserved = 0  # 유보 판정
    
    # KPI별 결과 그룹화
    kpi_results = {}
    for result in primary_results:
        kpi_name = result['kpiName']
        if kpi_name not in kpi_results:
            kpi_results[kpi_name] = []
        kpi_results[kpi_name].append(result)
    
    # 각 KPI별 상세 분석
    if kpi_results:
        insights['summary'].append("=== Primary KPI 상세 분석 ===")
        for kpi_name, results in kpi_results.items():
            # variation_count > 1인 경우 variations 배열에서 verdict 추출
            def get_verdicts(result):
                if 'variations' in result and result['variations']:
                    return [v.get('verdict') for v in result['variations']]
                else:
                    return [result.get('verdict')]
            
            wins = 0
            losses = 0
            no_diff = 0
            reserved = 0
            
            for r in results:
                verdicts = get_verdicts(r)
                for verdict in verdicts:
                    # verdict가 None이면 건너뛰기
                    if verdict is None:
                        continue
                    if 'Variation 우세' in verdict:
                        wins += 1
                    if 'Control 우세' in verdict:
                        losses += 1
                    if verdict == '차이 없음' or verdict == '차이없음':
                        no_diff += 1
                    if '유보' in verdict:
                        reserved += 1
            
            # KPI별 평균 uplift 계산
            uplifts = []
            for r in results:
                if 'variations' in r and r['variations']:
                    for v in r['variations']:
                        if v.get('uplift') is not None:
                            uplifts.append(v['uplift'])
                elif r.get('uplift') is not None:
                    uplifts.append(r['uplift'])
            avg_uplift = sum(uplifts) / len(uplifts) if uplifts else 0
            
            kpi_summary_parts = []
            if wins > 0:
                kpi_summary_parts.append(f"Variation 우세 {wins}개")
            if losses > 0:
                kpi_summary_parts.append(f"Control 우세 {losses}개")
            if no_diff > 0:
                kpi_summary_parts.append(f"차이 없음 {no_diff}개")
            if reserved > 0:
                kpi_summary_parts.append(f"유보 {reserved}개")
            
            kpi_summary = f"{kpi_name}: {', '.join(kpi_summary_parts)}"
            if avg_uplift != 0:
                kpi_summary += f" (평균 Uplift: {avg_uplift:+.2f}%)"
            insights['summary'].append(kpi_summary)
            
    
    # 전체 Primary KPI 집계
    for result in primary_results:
        if 'variations' in result and result['variations']:
            # variation_count > 1인 경우 variations 배열에서 verdict 추출
            for var in result['variations']:
                verdict = var.get('verdict')
                # verdict가 None이면 건너뛰기
                if verdict is None:
                    continue
                if 'Variation 우세 (유보)' in verdict:
                    primary_wins += 1
                    primary_reserved += 1
                elif 'Variation 우세' in verdict:
                    primary_wins += 1
                elif 'Control 우세 (유보)' in verdict:
                    primary_losses += 1
                    primary_reserved += 1
                elif 'Control 우세' in verdict:
                    primary_losses += 1
                elif verdict == '차이 없음' or verdict == '차이없음':
                    primary_no_diff += 1
        else:
            # variation_count = 1인 경우
            verdict = result.get('verdict')
            # verdict가 None이면 건너뛰기
            if verdict is None:
                continue
        if 'Variation 우세 (유보)' in verdict:
            primary_wins += 1
            primary_reserved += 1
        elif 'Variation 우세' in verdict:
            primary_wins += 1
        elif 'Control 우세 (유보)' in verdict:
            primary_losses += 1
            primary_reserved += 1
        elif 'Control 우세' in verdict:
            primary_losses += 1
        elif verdict == '차이 없음' or verdict == '차이없음':
            primary_no_diff += 1
    
    # Revenue 별도 분석
    revenue_results = [r for r in primary_results if 'Revenue' in r['kpiName'] or r['kpiName'] == 'Revenue']
    if revenue_results:
        insights['summary'].append("")
        insights['summary'].append("=== Revenue 분석 ===")
        for revenue_result in revenue_results:
            revenue_uplift = revenue_result.get('uplift', 0)
            revenue_conf = revenue_result.get('confidence')
            revenue_verdict = revenue_result.get('verdict', '')
            revenue_segment = revenue_result.get('device', 'All')
            
            if revenue_conf is None:
                insights['summary'].append(
                    f"Revenue ({revenue_segment}): {revenue_uplift:+.2f}% 변화 (판정: {revenue_verdict}, 신뢰도 계산 불가)"
                )
            else:
                direction = "증가" if revenue_uplift > 0 else "감소" if revenue_uplift < 0 else "변화 없음"
                insights['summary'].append(
                    f"Revenue ({revenue_segment}): {direction} {abs(revenue_uplift):.2f}% (신뢰도: {revenue_conf:.2f}%, 판정: {revenue_verdict})"
                )
    
    
    # AI를 통한 추가 인사이트 생성 (선택적)
    if use_ai:
        print("DEBUG: AI 인사이트 생성 시작...")
        try:
            from ai_insights import generate_ai_insights
            
            # 리포트 순서별로 결과 그룹화
            results_by_report_order = {}
            for result in primary_results:
                report_order = result.get('reportOrder', '1st report')
                if report_order not in results_by_report_order:
                    results_by_report_order[report_order] = []
                results_by_report_order[report_order].append(result)
            
            # AI에 전달할 요약 정보 준비 (상세한 결과 데이터 포함)
            results_summary = {
                'kpis': primary_results,  # 전체 KPI 결과 데이터
                'kpis_by_report_order': results_by_report_order,  # 리포트 순서별 그룹화된 결과
                'basic_insights_summary': insights['summary'].copy()  # 기본 인사이트 요약
            }
            
            print(f"DEBUG: KPI 개수: {len(primary_results)}")
            print(f"DEBUG: 기본 인사이트 개수: {len(insights['summary'])}")
            
            ai_insight = generate_ai_insights(results_summary)
            print(f"DEBUG: AI 인사이트 생성 결과: {ai_insight is not None}")
            
            if ai_insight:
                print(f"DEBUG: AI 인사이트 길이: {len(ai_insight)} 문자")
                print(f"DEBUG: AI 인사이트 미리보기 (처음 200자): {ai_insight[:200]}...")
                
                if ai_insight.strip():
                    # AI 인사이트를 summary에 추가
                    insights['summary'].append("")
                    insights['summary'].append("=== AI 심층 분석 ===")
                    insights['summary'].append(ai_insight.strip())
                    print("DEBUG: AI 인사이트가 summary에 추가되었습니다.")
                else:
                    print("DEBUG: AI 인사이트가 비어있습니다 (공백만 포함).")
            else:
                print("DEBUG: AI 인사이트 생성 실패 - None 반환됨")
        except ImportError as e:
            print(f"Warning: ai_insights 모듈을 가져올 수 없습니다. AI 기능을 건너뜁니다. 오류: {e}")
        except Exception as e:
            print(f"AI 인사이트 생성 실패 (계속 진행): {e}")
            import traceback
            print(f"상세 오류: {traceback.format_exc()}")
    
    # 추천 결정 및 상세 설명
    if primary_losses > 0:
        insights['recommendation'] = 'Hold: KPI에서 Control이 우세한 지표가 발견되었습니다. 현재 Variation은 롤아웃할 수 없으며, 추가 개선이 필요합니다.'
    elif primary_wins > 0 and primary_losses == 0:
        if primary_reserved > 0:
            insights['recommendation'] = 'Rollout (조건부): KPI에서 Variation 우세가 확인되었습니다. 다만 일부 지표에서 유보 판정이 있으므로, 모니터링을 강화하고 점진적 롤아웃을 권장합니다.'
        else:
            insights['recommendation'] = 'Rollout: KPI에서 일관되게 Variation 우세가 확인되었습니다. Variation을 롤아웃할 수 있습니다.'
    elif primary_no_diff > 0 and primary_wins == 0:
        insights['recommendation'] = 'Iterate: KPI에서 유의미한 차이가 없습니다. Variation의 효과를 높이기 위한 개선 사항을 검토하고 재테스트를 권장합니다.'
    else:
        insights['recommendation'] = 'Iterate: 테스트 결과를 바탕으로 Variation을 개선하고 재테스트를 권장합니다.'
    
    return insights

def clean_results_for_json(results):
    """결과 딕셔너리에서 NaN 값을 None으로 변환"""
    if isinstance(results, dict):
        cleaned = {}
        for k, v in results.items():
            if isinstance(v, (float, np.floating)):
                if np.isnan(v) or np.isinf(v):
                    cleaned[k] = None
                else:
                    cleaned[k] = v
            elif isinstance(v, dict):
                cleaned[k] = clean_results_for_json(v)
            elif isinstance(v, list):
                cleaned[k] = [clean_results_for_json(item) for item in v]
            else:
                cleaned[k] = v
        return cleaned
    elif isinstance(results, list):
        return [clean_results_for_json(item) for item in results]
    elif isinstance(results, (float, np.floating)):
        if np.isnan(results) or np.isinf(results):
            return None
        return results
    elif pd.isna(results):
        return None
    return results

def main():
    if len(sys.argv) < 3:
        print("Usage: python analyze.py <excel_file> <config_json>")
        sys.exit(1)
    
    file_path = sys.argv[1]
    config_path = sys.argv[2]
    
    # 설정 로드
    with open(config_path, 'r', encoding='utf-8') as f:
        config = json.load(f)
    
    # === 디버깅: Config 로드 직후 ===
    print(f"\n=== Python: Config 파일 로드 완료 ===")
    print(f"config.json 파일 경로: {config_path}")
    print(f"config 키 목록: {list(config.keys())}")
    print(f"config.get('kpis') 존재 여부: {'kpis' in config}")
    print(f"config.get('primaryKPIs') 존재 여부: {'primaryKPIs' in config}")
    if 'kpis' in config:
        print(f"config['kpis'] 개수: {len(config['kpis'])}")
        print(f"config['kpis'] 내용: {config['kpis']}")
    if 'primaryKPIs' in config:
        print(f"config['primaryKPIs'] 개수: {len(config['primaryKPIs'])}")
        print(f"config['primaryKPIs'] 내용: {config['primaryKPIs']}")
    
    # 프론트엔드에서 'kpis'로 전달되면 'primaryKPIs'로 매핑
    if 'kpis' in config and 'primaryKPIs' not in config:
        print(f"[매핑] config['kpis']를 config['primaryKPIs']로 복사합니다.")
        config['primaryKPIs'] = config['kpis']
        print(f"[매핑 후] config['primaryKPIs'] 개수: {len(config['primaryKPIs'])}")
    
    # 여러 파일 처리 여부 확인
    files_config = config.get('files', [])
    
    print(f"\n=== 설정 확인 ===")
    print(f"files_config 존재 여부: {files_config is not None}")
    print(f"files_config 길이: {len(files_config) if files_config else 0}")
    if files_config:
        print(f"files_config 내용: {files_config}")
    
    if files_config and len(files_config) > 0:
        # 여러 파일 처리
        print(f"\n=== 여러 파일 처리 시작: 총 {len(files_config)}개 파일 ===")
        all_primary_results = []
        all_parsed_data = []  # 모든 파일의 파싱된 데이터를 저장할 리스트
        first_segment_names = None  # 첫 번째 파일의 segment_names 저장
        
        for idx, file_info in enumerate(files_config):
            file_path = file_info['path']
            file_country = file_info.get('country', 'UK')
            report_order = file_info.get('reportOrder', '1st report')
            
            print(f"\n{'='*60}")
            print(f"파일 {idx + 1}/{len(files_config)} 처리 중")
            print(f"파일 경로: {file_path}")
            print(f"국가: {file_country}, 리포트 순서: {report_order}")
            print(f"{'='*60}")
            
            try:
                # Excel 파싱
                data_df, segment_names, detected_country, is_multi_country, countries = parse_excel(file_path)
                print(f"파싱 완료: {len(data_df)}행, 감지된 국가: {detected_country}, is_multi_country: {is_multi_country}")
                
                # 첫 번째 파일의 segment_names 저장 (나중에 재사용)
                if idx == 0:
                    first_segment_names = segment_names
                
                # 파싱된 데이터에 국가 코드와 리포트 순서 컬럼 추가
                # 먼저 A열의 이름을 Segment로 변경
                data_df_with_metadata = data_df.copy()
                data_df_with_metadata = data_df_with_metadata.rename(columns={'A': 'Segment'})
                
                # Report Order와 Country 컬럼을 맨 앞에 추가
                data_df_with_metadata.insert(0, 'Report Order', report_order)
                data_df_with_metadata.insert(1, 'Country', file_country)
                
                # 모든 파일의 데이터를 리스트에 추가 (열 이름은 나중에 설정)
                all_parsed_data.append(data_df_with_metadata)
                
                # 파일별 결과 처리는 하지 않음 (여러 국가 처리는 나중에 합쳐진 데이터 기준으로 수행)
                print(f"파일 {idx + 1} 파싱 완료: {len(data_df)}행")
            except Exception as e:
                print(f"파일 {idx + 1} 처리 중 오류 발생: {str(e)}")
                import traceback
                traceback.print_exc()
                continue
        
        print(f"\n=== 모든 파일 파싱 완료 ===")
        print(f"총 {len(all_parsed_data)}개 파일 파싱됨")
        
        # 모든 파일의 파싱된 데이터를 하나로 합치기
        if all_parsed_data:
            combined_data_df = pd.concat(all_parsed_data, ignore_index=True)
            print(f"\n=== 파싱된 데이터 합치기 ===")
            print(f"총 {len(combined_data_df)}행 (파일 {len(all_parsed_data)}개)")
            
            # 사용자가 입력한 세그먼트와 Variation 개수로 열 이름 생성
            user_segments = config.get('segments', [])
            if not user_segments:
                user_segments = ['All Visits']
            variation_count = config.get('variationCount', 1)
            
            # 열 이름 생성
            column_names = ['Report Order', 'Country', 'Segment']  # 처음 3개 컬럼
            
            # 각 세그먼트에 대해 Control과 Variation들 추가
            for segment_name in user_segments:
                if segment_name and segment_name.strip():
                    segment_name = segment_name.strip()
                    # Control 추가
                    column_names.append(f"{segment_name} - Control")
                    # Variation들 추가
                    for var_idx in range(1, variation_count + 1):
                        column_names.append(f"{segment_name} - Variation {var_idx}")
            
            # 기존 데이터프레임의 컬럼 수 확인
            existing_cols = list(combined_data_df.columns)
            print(f"기존 컬럼 수: {len(existing_cols)}, 생성된 열 이름 수: {len(column_names)}")
            
            # 열 이름이 기존 컬럼 수와 맞지 않으면 조정
            if len(column_names) < len(existing_cols):
                # 부족한 열은 기존 이름 유지
                for i in range(len(column_names), len(existing_cols)):
                    column_names.append(existing_cols[i])
            elif len(column_names) > len(existing_cols):
                # 열 이름이 더 많으면 필요한 만큼만 사용
                column_names = column_names[:len(existing_cols)]
            
            # 열 이름 적용
            combined_data_df.columns = column_names[:len(combined_data_df.columns)]
            
            print(f"열 이름 설정 완료: {len(combined_data_df.columns)}개 컬럼")
            print(f"처음 10개 열 이름: {list(combined_data_df.columns[:10])}")
            
            # 결과 초기화
            all_primary_results = []
            
            # 파싱된 데이터의 Country와 Report Order 컬럼에서 고유한 조합 추출
            if 'Country' in combined_data_df.columns and 'Report Order' in combined_data_df.columns:
                # 리포트 순서와 국가의 고유한 조합 추출
                unique_combinations = combined_data_df[['Report Order', 'Country']].drop_duplicates()
                unique_countries = combined_data_df['Country'].dropna().unique().tolist()
                unique_report_orders = combined_data_df['Report Order'].dropna().unique().tolist()
                
                print(f"\n=== 파싱된 데이터에서 발견된 리포트 순서와 국가 ===")
                print(f"고유한 리포트 순서: {unique_report_orders}")
                print(f"고유한 국가 목록: {unique_countries}")
                print(f"총 조합 개수: {len(unique_combinations)}")
                
                # 세그먼트 이름은 첫 번째 파일에서 저장된 것을 재사용 (중복 호출 제거)
                segment_names = first_segment_names if first_segment_names is not None else {}
                
                # 리포트 순서와 국가 조합별로 결과 생성
                if len(unique_combinations) > 0:
                    print(f"\n=== 리포트 순서와 국가 조합별로 분석을 수행합니다 ===")
                    
                    # 각 조합별로 처리
                    for idx, row in unique_combinations.iterrows():
                        report_order = row['Report Order']
                        country = row['Country']
                        
                        print(f"\n=== 리포트 순서: {report_order}, 국가: {country} 처리 중 ===")
                        
                        # 해당 리포트 순서와 국가의 데이터만 필터링
                        filtered_data = combined_data_df[
                            (combined_data_df['Report Order'] == report_order) & 
                            (combined_data_df['Country'] == country)
                        ].copy()
                        
                        if len(filtered_data) > 0:
                            # Country, Report Order, Segment 컬럼을 제외한 데이터만 사용
                            # Segment 컬럼을 A로, 나머지 컬럼을 B, C, D...로 변환
                            country_data_original = filtered_data.copy()
                            
                            # Segment 컬럼을 A로 변경
                            if 'Segment' in country_data_original.columns:
                                country_data_original = country_data_original.rename(columns={'Segment': 'A'})
                            
                            # Report Order와 Country 컬럼 제거
                            columns_to_drop = []
                            if 'Report Order' in country_data_original.columns:
                                columns_to_drop.append('Report Order')
                            if 'Country' in country_data_original.columns:
                                columns_to_drop.append('Country')
                            
                            if columns_to_drop:
                                country_data_original = country_data_original.drop(columns=columns_to_drop)
                            
                            # 컬럼 이름을 A, B, C, D...로 변경
                            new_columns = ['A'] + [chr(66 + i) for i in range(len(country_data_original.columns) - 1)]
                            country_data_original.columns = new_columns[:len(country_data_original.columns)]
                            
                            # 여러 국가인지 확인 (전체 국가 목록 기준)
                            is_multi_country = len(unique_countries) > 1
                            
                            # 해당 조합에 대한 결과 생성
                            print(f"  리포트 순서 {report_order}, 국가 {country}에 대한 결과 생성 중...")
                            country_results = process_single_file(
                                country_data_original, segment_names, country, is_multi_country, unique_countries,
                                country, config, report_order
                            )
                            
                            print(f"  KPI: {len(country_results['primary'])}개")
                            
                            all_primary_results.extend(country_results['primary'])
                        else:
                            print(f"  경고: 리포트 순서 {report_order}, 국가 {country}에 대한 데이터가 없습니다.")
                    
                    print(f"\n=== 모든 리포트 순서와 국가 조합에 대한 결과 생성 완료 ===")
                    print(f"총 KPI 결과: {len(all_primary_results)}개")
                    
                    # primary_results 업데이트
                    primary_results = all_primary_results
                else:
                    # 단일 국가인 경우: 합쳐진 데이터 전체를 사용하여 결과 생성
                    print(f"단일 국가입니다. 합쳐진 데이터 전체를 사용하여 결과를 생성합니다.")
                    
                    # 합쳐진 데이터를 원본 형식으로 변환
                    combined_data_original = combined_data_df.copy()
                    
                    # Segment 컬럼을 A로 변경
                    if 'Segment' in combined_data_original.columns:
                        combined_data_original = combined_data_original.rename(columns={'Segment': 'A'})
                    
                    # Report Order와 Country 컬럼 제거
                    columns_to_drop = []
                    if 'Report Order' in combined_data_original.columns:
                        columns_to_drop.append('Report Order')
                    if 'Country' in combined_data_original.columns:
                        columns_to_drop.append('Country')
                    
                    if columns_to_drop:
                        combined_data_original = combined_data_original.drop(columns=columns_to_drop)
                    
                    # 컬럼 이름을 A, B, C, D...로 변경
                    new_columns = ['A'] + [chr(66 + i) for i in range(len(combined_data_original.columns) - 1)]
                    combined_data_original.columns = new_columns[:len(combined_data_original.columns)]
                    
                    # 단일 국가에 대한 결과 생성
                    single_country = unique_countries[0] if unique_countries else 'UK'
                    country_report_order = combined_data_df['Report Order'].iloc[0] if 'Report Order' in combined_data_df.columns else '1st report'
                    
                    print(f"  국가 {single_country}에 대한 결과 생성 중...")
                    country_results = process_single_file(
                        combined_data_original, segment_names, single_country, False, [single_country],
                        single_country, config, country_report_order
                    )
                    
                    print(f"  KPI: {len(country_results['primary'])}개")
                    all_primary_results.extend(country_results['primary'])
            
            # 합쳐진 데이터를 Excel로 저장
            import os
            cwd = os.getcwd()
            tmp_dir = Path(cwd) / 'tmp'
            tmp_dir.mkdir(exist_ok=True)
            parsed_data_path = tmp_dir / 'parsed_data.xlsx'
            combined_data_df.to_excel(parsed_data_path, index=False, engine='openpyxl')
            print(f"합쳐진 파싱 데이터 저장 완료: {parsed_data_path}")
            
            # 결과 저장 및 인사이트 생성
            save_results_and_insights(all_primary_results, config)
        else:
            combined_data_df = None
    else:
        # 단일 파일 처리 (기존 로직)
        data_df, segment_names, detected_country, is_multi_country, countries = parse_excel(file_path)
        
        # 설정에서 국가 가져오기 (없으면 감지된 국가 사용)
        country = config.get('country', detected_country)
        
        file_results = process_single_file(
            data_df, segment_names, detected_country, is_multi_country, countries,
            country, config, None
        )
        
        primary_results = file_results['primary']
        
        # 결과 저장 및 인사이트 생성
        save_results_and_insights(primary_results, config)
    
    # 파싱된 데이터를 Excel로 저장
    if files_config and len(files_config) > 0:
        # 여러 파일의 경우 이미 합쳐진 데이터가 combined_data_df에 저장됨
        # 위에서 이미 저장했으므로 여기서는 건너뜀
        pass
    else:
        # 단일 파일인 경우
        data_df, _, _, _, _ = parse_excel(file_path)
        
        # 사용자가 입력한 세그먼트와 Variation 개수로 열 이름 생성
        user_segments = config.get('segments', [])
        if not user_segments:
            user_segments = ['All Visits']
        variation_count = config.get('variationCount', 1)
        
        # 열 이름 생성
        column_names = ['Segment']  # A열
        
        # 각 세그먼트에 대해 Control과 Variation들 추가
        for segment_name in user_segments:
            if segment_name and segment_name.strip():
                segment_name = segment_name.strip()
                # Control 추가
                column_names.append(f"{segment_name} - Control")
                # Variation들 추가
                for var_idx in range(1, variation_count + 1):
                    column_names.append(f"{segment_name} - Variation {var_idx}")
        
        # 기존 데이터프레임의 컬럼 수에 맞춰 조정
        existing_cols = list(data_df.columns)
        new_column_names = []
        new_column_names.append('Segment')  # A열을 Segment로 변경
        
        # B열부터 새로운 이름으로 변경
        data_col_idx = 0
        for col_idx in range(1, len(existing_cols)):  # B열부터 (인덱스 1부터)
            if data_col_idx < len(column_names) - 1:  # Segment 제외
                new_column_names.append(column_names[data_col_idx + 1])  # +1은 Segment 제외
                data_col_idx += 1
            else:
                # 이름이 부족하면 기존 컬럼 이름 유지
                new_column_names.append(existing_cols[col_idx])
        
        # 열 이름이 부족한 경우 처리
        if len(new_column_names) < len(existing_cols):
            for i in range(len(new_column_names), len(existing_cols)):
                new_column_names.append(existing_cols[i])
        
        # 열 이름 적용
        data_df.columns = new_column_names[:len(data_df.columns)]
        
        tmp_dir = Path(__file__).parent.parent / 'tmp'
        tmp_dir.mkdir(exist_ok=True)
        parsed_data_path = tmp_dir / 'parsed_data.xlsx'
        data_df.to_excel(parsed_data_path, index=False, engine='openpyxl')
        print(f"Parsed data saved to {parsed_data_path}")
        print(f"열 이름 설정 완료: {len(data_df.columns)}개 컬럼")
        print(f"처음 5개 열 이름: {list(data_df.columns[:5])}")

def process_single_file(data_df, segment_names, detected_country, is_multi_country, countries, country, config, report_order):
    """단일 파일 처리 함수"""
    
    print(f"\n{'='*60}")
    print(f"process_single_file 호출됨")
    print(f"  전달받은 country 파라미터: {country}")
    print(f"  detected_country: {detected_country}")
    print(f"  is_multi_country: {is_multi_country}")
    print(f"  countries: {countries}")
    print(f"  report_order: {report_order}")
    print(f"{'='*60}")
    
    # report_order를 결과에 포함하기 위해 전역 변수로 저장 (임시)
    if report_order:
        # 결과에 report_order를 추가하기 위해 compute_kpi 함수 호출 시 전달
        pass
    
    # Variation 개수 가져오기 (기본값: 1)
    variation_count = config.get('variationCount', 1)
    print(f"Variation 개수: {variation_count}")
    
    # 세그먼트 목록 가져오기 (사용자가 입력한 세그먼트)
    user_segments = config.get('segments', [])
    if not user_segments or len(user_segments) == 0:
        user_segments = ['All Visits']  # 기본값
    # 빈 문자열 필터링
    user_segments = [s for s in user_segments if s and str(s).strip() != '']
    if not user_segments:
        user_segments = ['All Visits']  # 필터링 후 비어있으면 기본값
    print(f"=== 세그먼트 처리 ===")
    print(f"config에서 가져온 segments: {config.get('segments', [])}")
    print(f"필터링 후 사용자 입력 세그먼트: {user_segments}")
    print(f"세그먼트 개수: {len(user_segments)}")
    
    # 세그먼트 매핑 생성 (사용자 입력 세그먼트 사용)
    print(f"원본 세그먼트 이름: {segment_names}")
    print(f"Variation 개수: {variation_count}")
    segment_mapping = detect_segments_from_user_input(user_segments, variation_count)
    print(f"생성된 세그먼트 매핑: {segment_mapping}")
    print(f"세그먼트 매핑 개수: {len(segment_mapping)}")
    if len(segment_mapping) == 0:
        print("경고: 세그먼트 매핑이 비어있습니다!")
    print(f"여러 국가 테스트 여부: {is_multi_country}")
    if is_multi_country:
        print(f"감지된 국가들: {countries}")
    else:
        print(f"사용할 국가: {country} (감지된 국가: {detected_country})")
    
    # 세그먼트가 비어있으면 기본값 사용
    if not segment_mapping:
        print("경고: 세그먼트 매핑이 비어있습니다. 기본 구조를 사용합니다.")
        segment_mapping = [('All', 'B', 'C')]
    
    # 파싱된 데이터를 Excel로 저장 (분석용)
    tmp_dir = Path(__file__).parent.parent / 'tmp'
    tmp_dir.mkdir(exist_ok=True)
    parsed_data_path = tmp_dir / 'parsed_data.xlsx'
    data_df.to_excel(parsed_data_path, index=False, engine='openpyxl')
    print(f"Parsed data saved to {parsed_data_path}")
    print(f"파싱된 데이터 행 수: {len(data_df)}")
    
    # 디버그 모드 (환경 변수로 제어 가능)
    debug = config.get('debug', False)
    
    # 여러 국가인 경우 각 국가별로 처리
    # 하지만 사용자가 선택한 국가가 있으면 해당 국가만 처리 (감지된 목록에 없어도 사용자 선택 우선)
    if is_multi_country and countries:
        # 사용자가 선택한 국가가 있으면 해당 국가를 우선 사용 (감지된 목록에 없어도 사용)
        if country:
            print(f"사용자가 선택한 국가: {country} (파일에서 감지된 국가들: {countries})")
            # 사용자가 선택한 국가를 우선 사용 (감지된 목록에 없어도 사용)
            selected_country = country
            print(f"사용자가 선택한 국가 {country}를 사용합니다. (감지된 목록에 없어도 사용)")
        else:
            # 사용자가 선택한 국가가 없으면 감지된 첫 번째 국가 사용
            selected_country = countries[0] if countries else 'UK'
            print(f"사용자가 선택한 국가가 없습니다. 감지된 첫 번째 국가 {selected_country}를 사용합니다.")
        
        primary_results = []
        
        # 국가별 컬럼 매핑 가져오기
        country_column_mapping = data_df.attrs.get('country_column_mapping', {})
        
        # selected_country는 위에서 이미 설정되었으므로 그대로 사용
        print(f"\n=== 사용자가 선택한 국가: {selected_country} 처리 중 ===")
        print(f"  파일에서 감지된 국가들: {countries}")
        print(f"  사용자가 선택한 국가: {country}")
        print(f"  최종 사용 국가: {selected_country}")
        
        # 사용자가 입력한 세그먼트 매핑을 사용
        country_segment_mapping = segment_mapping
        print(f"  사용할 세그먼트 매핑 (사용자 입력): {country_segment_mapping}")
        
        # 전체 데이터를 사용 (컬럼 매핑만 다르게 적용)
        country_data_df = data_df.copy()
    
        # Primary KPI 계산
        print(f"\n=== Primary KPI 계산 시작 (여러 국가) ===")
        print(f"config 키 목록: {list(config.keys())}")
        print(f"config.get('primaryKPIs') 개수: {len(config.get('primaryKPIs', []))}")
        print(f"config.get('primaryKPIs') 내용: {config.get('primaryKPIs', [])}")
        
        primary_kpis = config.get('primaryKPIs', [])
        if not primary_kpis:
            print(f"[경고] primaryKPIs가 비어있습니다!")
            print(f"[경고] config에 'kpis' 키가 있는지 확인: {'kpis' in config}")
            if 'kpis' in config:
                print(f"[경고] config['kpis']가 존재하지만 primaryKPIs로 복사되지 않았습니다!")
                print(f"[경고] config['kpis'] 내용: {config['kpis']}")
        
        print(f"Primary KPI 개수: {len(primary_kpis)}")
        for kpi_config in primary_kpis:
            print(f"  처리 중: {kpi_config.get('name')}, type: {kpi_config.get('type')}, numerator: {kpi_config.get('numerator')}, denominator: {kpi_config.get('denominator')}")
            
            # === 필터링 디버깅 ===
            print(f"  [필터링 체크] KPI 전체 내용: {kpi_config}")
            print(f"  [필터링 체크] name 존재: {bool(kpi_config.get('name'))}")
            print(f"  [필터링 체크] numerator 존재: {bool(kpi_config.get('numerator'))}")
            
            # 모든 KPI를 처리하되, name 또는 numerator가 있으면 처리
            has_required_fields = False
            if kpi_config.get('name') or kpi_config.get('numerator'):
                print(f"  [필터링 체크] name 또는 numerator가 있음 -> 처리 대상")
                kpi_type = kpi_config.get('type', 'rate')
                # revenue, variation_only, simple 타입은 denominator 불필요
                if kpi_type == 'revenue' or kpi_type == 'variation_only' or kpi_type == 'simple':
                    has_required_fields = True
                    print(f"  [필터링 체크] type이 {kpi_type} -> has_required_fields = True")
                # 다른 타입도 denominator 없어도 처리 (선택사항)
                else:
                    has_required_fields = True
                    print(f"  [필터링 체크] type이 {kpi_type} -> has_required_fields = True")
            else:
                print(f"  [필터링 체크] name과 numerator 모두 없음 -> 건너뜀")
            
            print(f"  [필터링 결과] has_required_fields = {has_required_fields}")
            
            if has_required_fields:
                results, missing_metrics = compute_kpi(country_data_df, kpi_config, selected_country, country_segment_mapping, variation_count, debug=True, report_order=report_order)
                # report_order 추가
                if report_order:
                    for r in results:
                        r['reportOrder'] = report_order
                # 메트릭을 찾지 못한 경우 에러 결과 추가
                for missing in missing_metrics:
                    error_result = {
                        'country': missing['country'],
                        'device': missing['segment'],
                        'kpiName': kpi_config['name'],
                        'error': True,
                        'errorMessage': f"{missing['reportOrder']} ({missing['country']}) 파일에서 메트릭 '{missing['metric']}'을(를) 찾을 수 없습니다.",
                        'reportOrder': missing['reportOrder']
                    }
                    results.append(error_result)
                # 국가 정보 확인 및 추가 (항상 사용자가 선택한 국가로 설정)
                for r in results:
                    r['country'] = selected_country  # 항상 사용자가 선택한 국가로 설정
                print(f"    결과 개수: {len(results)}")
                print(f"    결과에 포함된 국가 정보: {[r.get('country') for r in results[:3]]}")  # 처음 3개만 로그
                if len(results) == 0:
                    print(f"    경고: 결과가 없습니다. segment_mapping을 확인하세요.")
                primary_results.extend(results)
        
        # Secondary와 Additional KPI는 제거됨 - 모든 KPI를 primary로 통합
    else:
        # 단일 국가 처리 (기존 로직)
        primary_results = []
        print(f"\n=== Primary KPI 계산 시작 (단일 국가) ===")
        print(f"config 키 목록: {list(config.keys())}")
        print(f"config.get('primaryKPIs') 개수: {len(config.get('primaryKPIs', []))}")
        print(f"config.get('primaryKPIs') 내용: {config.get('primaryKPIs', [])}")
        
        primary_kpis = config.get('primaryKPIs', [])
        if not primary_kpis:
            print(f"[경고] primaryKPIs가 비어있습니다!")
            print(f"[경고] config에 'kpis' 키가 있는지 확인: {'kpis' in config}")
            if 'kpis' in config:
                print(f"[경고] config['kpis']가 존재하지만 primaryKPIs로 복사되지 않았습니다!")
                print(f"[경고] config['kpis'] 내용: {config['kpis']}")
        
        print(f"Primary KPI 개수: {len(primary_kpis)}")
        for kpi_config in primary_kpis:
            print(f"  처리 중: {kpi_config.get('name')}, type: {kpi_config.get('type')}, numerator: {kpi_config.get('numerator')}, denominator: {kpi_config.get('denominator')}")
            
            # === 필터링 디버깅 ===
            print(f"  [필터링 체크] KPI 전체 내용: {kpi_config}")
            print(f"  [필터링 체크] name 존재: {bool(kpi_config.get('name'))}")
            print(f"  [필터링 체크] numerator 존재: {bool(kpi_config.get('numerator'))}")
            
            # 모든 KPI를 처리하되, name 또는 numerator가 있으면 처리
            has_required_fields = False
            if kpi_config.get('name') or kpi_config.get('numerator'):
                print(f"  [필터링 체크] name 또는 numerator가 있음 -> 처리 대상")
                kpi_type = kpi_config.get('type', 'rate')
                # revenue, variation_only, simple 타입은 denominator 불필요
                if kpi_type == 'revenue' or kpi_type == 'variation_only' or kpi_type == 'simple':
                    has_required_fields = True
                    print(f"  [필터링 체크] type이 {kpi_type} -> has_required_fields = True, denominator 불필요")
                # 다른 타입도 denominator 없어도 처리 (선택사항)
                else:
                    has_required_fields = True
                    if kpi_config.get('denominator'):
                        print(f"  [필터링 체크] type이 {kpi_type} -> has_required_fields = True, denominator 있음")
                    else:
                        print(f"  [필터링 체크] type이 {kpi_type} -> has_required_fields = True, denominator 없음 (선택사항)")
            else:
                print(f"  [필터링 체크] name과 numerator 모두 없음 -> 건너뜀")
            
            print(f"  [필터링 결과] has_required_fields = {has_required_fields}")
            
            if has_required_fields:
                # 사용자가 선택한 국가 사용
                selected_country = country or 'N/A'
                print(f"    사용할 국가: {selected_country}")
                results, missing_metrics = compute_kpi(data_df, kpi_config, selected_country, segment_mapping, variation_count, debug, report_order=report_order)
                # report_order 추가
                if report_order:
                    for r in results:
                        r['reportOrder'] = report_order
                # 메트릭을 찾지 못한 경우 에러 결과 추가
                for missing in missing_metrics:
                    error_result = {
                        'country': missing['country'],
                        'device': missing['segment'],
                        'kpiName': kpi_config['name'],
                        'error': True,
                        'errorMessage': f"{missing['reportOrder']} ({missing['country']}) 파일에서 메트릭 '{missing['metric']}'을(를) 찾을 수 없습니다.",
                        'reportOrder': missing['reportOrder']
                    }
                    results.append(error_result)
                # 국가 정보 확인 및 추가 (항상 사용자가 선택한 국가로 설정)
                for r in results:
                    r['country'] = selected_country  # 항상 사용자가 선택한 국가로 설정
                print(f"    결과 개수: {len(results)}")
                primary_results.extend(results)
                if not results:
                    print(f"    경고: Primary KPI '{kpi_config.get('name', 'Unknown')}'에 대한 결과가 없습니다.")
            else:
                print(f"    필수 필드가 없어 건너뜁니다.")
    
    # Secondary와 Additional KPI는 제거됨 - 모든 KPI를 primary로 통합
    
    return {
        'primary': primary_results
    }

def save_results_and_insights(primary_results, config):
    """결과 저장 및 인사이트 생성"""
    
    # 결과가 비어있으면 경고
    if not primary_results:
        print("경고: 모든 KPI 계산 결과가 비어있습니다.")
        print("가능한 원인:")
        print("1. Excel 파일 형식이 예상과 다름")
        print("2. 메트릭 라벨이 정확하지 않음")
        print("3. 국가 코드가 일치하지 않음")
    
    # 인사이트 생성 (AI 사용 여부는 config에서 확인)
    use_ai = config.get('useAI', False)  # 기본값은 False
    insights = generate_insights(primary_results, use_ai=use_ai)
    
    # 결과 저장
    output = {
        'primaryResults': primary_results,
        'insights': insights,
    }
    
    # NaN 값을 None으로 변환
    output = clean_results_for_json(output)
    
    # 결과 파일 저장 (현재 작업 디렉토리 사용)
    import os
    cwd = os.getcwd()
    tmp_dir = Path(cwd) / 'tmp'
    tmp_dir.mkdir(exist_ok=True)
    results_path = tmp_dir / 'results.json'
    
    with open(results_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2, cls=JSONEncoder)
    
    print(f"Results saved to {results_path}")

if __name__ == '__main__':
    main()


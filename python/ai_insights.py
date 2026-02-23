#!/usr/bin/env python3
"""
Google Gemini API를 사용한 AI 인사이트 생성
"""

import os
import json
import requests

def generate_ai_insights(results_summary, api_key=None):
    """
    Google Gemini API를 사용하여 인사이트 생성
    
    Args:
        results_summary: 분석 결과 요약 (딕셔너리) - kpis, kpis_by_report_order, basic_insights_summary 포함
        api_key: Gemini API 키 (없으면 환경 변수에서 가져옴)
    
    Returns:
        AI 생성 인사이트 텍스트 (None이면 실패)
    """
    if api_key is None:
        api_key = os.getenv('GEMINI_API_KEY')
    
    if not api_key:
        print("Warning: GEMINI_API_KEY 환경 변수가 설정되지 않았습니다. AI 인사이트를 생성할 수 없습니다.")
        return None
    
    # Primary KPI 상세 정보 준비
    primary_details = []
    kpis_data = results_summary.get('kpis', [])
    if kpis_data:
        for result in kpis_data[:15]:  # 최대 15개만
            kpi_name = result.get('kpiName', 'Unknown')
            segment = result.get('device', 'All')
            country = result.get('country', 'Unknown')
            report_order = result.get('reportOrder', '1st report')
            uplift = result.get('uplift', 0)
            confidence = result.get('confidence')
            verdict = result.get('verdict', '')
            
            # variations가 있는 경우 처리
            if 'variations' in result and result['variations']:
                for var in result['variations']:
                    var_num = var.get('variationNum', 1)
                    var_uplift = var.get('uplift', 0)
                    var_confidence = var.get('confidence')
                    var_verdict = var.get('verdict', '')
                    detail = f"- {kpi_name} ({country}, {report_order}, {segment}, Variation {var_num}): Uplift {var_uplift:+.2f}%"
                    if var_confidence is not None:
                        detail += f", 신뢰도 {var_confidence:.2f}%"
                    detail += f", 판정: {var_verdict}"
                    primary_details.append(detail)
            else:
                detail = f"- {kpi_name} ({country}, {report_order}, {segment}): Uplift {uplift:+.2f}%"
            if confidence is not None:
                detail += f", 신뢰도 {confidence:.2f}%"
            detail += f", 판정: {verdict}"
            primary_details.append(detail)
    
    # 리포트 순서별 비교 정보 준비
    comparison_info = ""
    kpis_by_report_order = results_summary.get('kpis_by_report_order', {})
    if len(kpis_by_report_order) > 1:
        # 리포트 순서 정렬 (1st, 2nd, 3rd 등)
        sorted_report_orders = sorted(kpis_by_report_order.keys(), key=lambda x: (
            int(x.split()[0]) if x.split()[0].isdigit() else 999
        ))
        
        if len(sorted_report_orders) >= 2:
            first_order = sorted_report_orders[0]
            second_order = sorted_report_orders[1]
            
            first_results = kpis_by_report_order[first_order]
            second_results = kpis_by_report_order[second_order]
            
            # 국가별, KPI별로 그룹화하여 비교
            comparison_info = "\n\n=== 리포트 순서 간 비교 분석 요청 ===\n"
            comparison_info += f"다음은 {first_order}와 {second_order} 간의 비교 분석입니다.\n\n"
            
            # 국가별로 그룹화
            first_by_country = {}
            for r in first_results:
                country = r.get('country', 'Unknown')
                if country not in first_by_country:
                    first_by_country[country] = []
                first_by_country[country].append(r)
            
            second_by_country = {}
            for r in second_results:
                country = r.get('country', 'Unknown')
                if country not in second_by_country:
                    second_by_country[country] = []
                second_by_country[country].append(r)
            
            # 각 국가별로 비교
            all_countries = set(list(first_by_country.keys()) + list(second_by_country.keys()))
            for country in all_countries:
                first_country_results = first_by_country.get(country, [])
                second_country_results = second_by_country.get(country, [])
                
                if first_country_results and second_country_results:
                    comparison_info += f"\n[{country} 국가]\n"
                    
                    # KPI별로 그룹화
                    first_by_kpi = {}
                    for r in first_country_results:
                        kpi_name = r.get('kpiName', 'Unknown')
                        if kpi_name not in first_by_kpi:
                            first_by_kpi[kpi_name] = []
                        first_by_kpi[kpi_name].append(r)
                    
                    second_by_kpi = {}
                    for r in second_country_results:
                        kpi_name = r.get('kpiName', 'Unknown')
                        if kpi_name not in second_by_kpi:
                            second_by_kpi[kpi_name] = []
                        second_by_kpi[kpi_name].append(r)
                    
                    # 각 KPI별로 비교
                    all_kpis = set(list(first_by_kpi.keys()) + list(second_by_kpi.keys()))
                    for kpi_name in all_kpis:
                        first_kpi_results = first_by_kpi.get(kpi_name, [])
                        second_kpi_results = second_by_kpi.get(kpi_name, [])
                        
                        if first_kpi_results and second_kpi_results:
                            # 첫 번째 리포트의 평균 uplift
                            first_uplifts = []
                            for r in first_kpi_results:
                                if 'variations' in r and r['variations']:
                                    for v in r['variations']:
                                        if v.get('uplift') is not None:
                                            first_uplifts.append(v['uplift'])
                                elif r.get('uplift') is not None:
                                    first_uplifts.append(r['uplift'])
                            first_avg_uplift = sum(first_uplifts) / len(first_uplifts) if first_uplifts else 0
                            
                            # 두 번째 리포트의 평균 uplift
                            second_uplifts = []
                            for r in second_kpi_results:
                                if 'variations' in r and r['variations']:
                                    for v in r['variations']:
                                        if v.get('uplift') is not None:
                                            second_uplifts.append(v['uplift'])
                                elif r.get('uplift') is not None:
                                    second_uplifts.append(r['uplift'])
                            second_avg_uplift = sum(second_uplifts) / len(second_uplifts) if second_uplifts else 0
                            
                            change = second_avg_uplift - first_avg_uplift
                            comparison_info += f"  {kpi_name}: {first_order} 평균 Uplift {first_avg_uplift:+.2f}% → {second_order} 평균 Uplift {second_avg_uplift:+.2f}% (변화: {change:+.2f}%p)\n"
    
    # 결과 요약을 프롬프트로 변환
    prompt = f"""다음은 A/B 테스트 분석 결과입니다:

=== Primary KPI 결과 ===
{chr(10).join(primary_details) if primary_details else 'Primary KPI 결과 없음'}
{comparison_info}

=== 기본 인사이트 요약 ===
{chr(10).join(results_summary.get('basic_insights_summary', []))}

위 결과를 바탕으로 간결하고 핵심적인 인사이트를 작성해주세요:
1. 주요 발견사항 2-3개를 간단히 요약 (각각 1문장)
2. 세그먼트별 주요 패턴을 간단히 설명 (1-2문장)
3. 리포트 순서가 여러 개인 경우, 2번째 테스트가 1번째에 비해 어떻게 변화했는지 국가별, KPI별로 간단히 설명 (2-3문장)
4. 비즈니스 관점에서의 의미와 다음 단계 추천 (2-3문장)

중요 사항:
- 마크다운 형식(###, **, --- 등)을 사용하지 말고 일반 텍스트로 작성
- 불필요한 설명이나 반복을 피하고 핵심만 간결하게
- 리포트 순서 간 비교가 있는 경우, 국가별, KPI별 변화를 구체적으로 언급하고 숫자와 퍼센트를 포함
- 전체 응답은 300~500자 정도로 매우 간결하게 작성
- 핵심 인사이트만 제공하고 불필요한 설명은 생략
- 한국어로 자연스럽게 작성

예시 형식:
Primary KPI 'ㅊㅊ'에서 전체 방문자는 차이 없음, 모바일에서는 1.86% 상승했으나 모수 부족으로 결론 도출 어려움. PC 세그먼트도 모수 부족 상태. 2번째 리포트에서 CA 국가의 Cart CVR은 1번째 리포트 대비 2.5%p 개선되었으며, 이는 통계적으로 유의미한 변화입니다. 전체적으로 통계적으로 유의미한 차이는 발견되지 않았으며, 추가 데이터 수집이 필요합니다."""
    
    return call_gemini_api(prompt, api_key)

def call_gemini_api(prompt, api_key):
    """Google Gemini API 호출"""
    print(f"DEBUG: Gemini API 호출 시작")
    print(f"DEBUG: 프롬프트 길이: {len(prompt)} 문자")
    print(f"DEBUG: API 키 존재 여부: {bool(api_key)}")
    print(f"DEBUG: API 키 길이: {len(api_key) if api_key else 0}")
    
    # 먼저 사용 가능한 모델 목록 확인
    try:
        list_models_url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
        print(f"DEBUG: 사용 가능한 모델 목록 확인 중...")
        list_response = requests.get(list_models_url, timeout=10)
        if list_response.status_code == 200:
            models_data = list_response.json()
            if 'models' in models_data:
                available_models = [m.get('name', '') for m in models_data['models']]
                print(f"DEBUG: 사용 가능한 모델 목록: {available_models[:5]}...")  # 처음 5개만 출력
                # generateContent를 지원하는 모델 찾기
                supported_models = []
                for model in models_data['models']:
                    if 'supportedGenerationMethods' in model:
                        if 'generateContent' in model['supportedGenerationMethods']:
                            model_name = model.get('name', '').replace('models/', '')
                            supported_models.append(model_name)
                print(f"DEBUG: generateContent 지원 모델: {supported_models[:5]}...")
                
                # 지원되는 모델이 있으면 첫 번째 사용
                if supported_models:
                    model_name = supported_models[0]
                    print(f"DEBUG: 선택된 모델: {model_name}")
                else:
                    model_name = "gemini-pro"
                    print(f"DEBUG: 지원 모델 없음, 기본값 사용: {model_name}")
            else:
                model_name = "gemini-pro"
                print(f"DEBUG: 모델 목록 없음, 기본값 사용: {model_name}")
        else:
            print(f"DEBUG: 모델 목록 조회 실패 (상태 코드: {list_response.status_code})")
            model_name = "gemini-pro"
    except Exception as e:
        print(f"DEBUG: 모델 목록 조회 중 오류: {e}")
        model_name = "gemini-pro"
    
    # v1beta API 사용
    api_version = "v1beta"
    url = f"https://generativelanguage.googleapis.com/{api_version}/models/{model_name}:generateContent?key={api_key}"
    print(f"DEBUG: 최종 사용 모델: {model_name}")
    print(f"DEBUG: API 버전: {api_version}")
    
    payload = {
        "contents": [{
            "parts": [{"text": prompt}]
        }],
        "generationConfig": {
            "temperature": 0.7,
            "topK": 40,
            "topP": 0.95,
            "maxOutputTokens": 8192,  # 더 긴 응답을 위해 증가
        }
    }
    
    try:
        print(f"DEBUG: Gemini API 요청 전송 중...")
        response = requests.post(url, json=payload, timeout=30)
        print(f"DEBUG: Gemini API 응답 상태 코드: {response.status_code}")
        
        response.raise_for_status()
        result = response.json()
        
        print(f"DEBUG: Gemini API 응답 수신 완료")
        print(f"DEBUG: 응답에 'candidates' 키 존재: {'candidates' in result}")
        
        if 'candidates' in result:
            print(f"DEBUG: candidates 개수: {len(result['candidates'])}")
        
        if 'candidates' in result and len(result['candidates']) > 0:
            content = result['candidates'][0].get('content', {})
            parts = content.get('parts', [])
            print(f"DEBUG: parts 개수: {len(parts)}")
            
            if parts and len(parts) > 0:
                text = parts[0].get('text', '')
                print(f"DEBUG: 추출된 텍스트 길이: {len(text)} 문자")
                if text:
                    print(f"DEBUG: 텍스트 미리보기 (처음 200자): {text[:200]}...")
                return text
            else:
                print("DEBUG: parts가 비어있거나 없음")
        
        print(f"DEBUG: Gemini API 응답 형식 오류 - candidates가 없거나 비어있음")
        print(f"DEBUG: 응답 내용: {json.dumps(result, ensure_ascii=False, indent=2)[:500]}...")
        return None
        
    except requests.exceptions.Timeout:
        print("DEBUG: Gemini API 타임아웃 오류")
        return None
    except requests.exceptions.RequestException as e:
        print(f"DEBUG: Gemini API 요청 오류: {e}")
        if hasattr(e, 'response') and e.response is not None:
            try:
                error_detail = e.response.json()
                print(f"DEBUG: 오류 상세: {json.dumps(error_detail, ensure_ascii=False, indent=2)}")
                
                # 404 또는 503 에러인 경우 다른 모델/버전으로 재시도
                if e.response.status_code == 404 or e.response.status_code == 503:
                    error_type = "404" if e.response.status_code == 404 else "503 (서버 과부하)"
                    print(f"DEBUG: {error_type} 에러 발생, 대체 모델로 재시도...")
                    
                    # 503 에러인 경우 짧은 대기 후 같은 모델로 재시도 먼저 시도
                    if e.response.status_code == 503:
                        import time
                        print("DEBUG: 503 에러 - 2초 대기 후 같은 모델로 재시도...")
                        time.sleep(2)
                        try:
                            retry_response = requests.post(url, json=payload, timeout=30)
                            if retry_response.status_code == 200:
                                retry_result = retry_response.json()
                                if 'candidates' in retry_result and len(retry_result['candidates']) > 0:
                                    content = retry_result['candidates'][0].get('content', {})
                                    parts = content.get('parts', [])
                                    if parts and len(parts) > 0:
                                        text = parts[0].get('text', '')
                                        print(f"DEBUG: 재시도 성공! 모델: {model_name}, 텍스트 길이: {len(text)} 문자")
                                        import re
                                        text = text.replace('###', '').replace('**', '').replace('---', '').replace('##', '')
                                        text = re.sub(r'\n{3,}', '\n\n', text)
                                        text = re.sub(r' {2,}', ' ', text)
                                        text = text.strip()
                                        return text
                        except Exception as retry_error:
                            print(f"DEBUG: 재시도 실패: {retry_error}")
                    
                    # 대체 모델 목록 시도
                    fallback_models = [
                        ("v1beta", "gemini-2.5-pro"),
                        ("v1beta", "gemini-2.0-flash-exp"),
                        ("v1beta", "gemini-2.0-flash"),
                        ("v1beta", "gemini-1.5-flash-latest"),
                        ("v1beta", "gemini-1.5-pro-latest"),
                        ("v1", "gemini-pro"),
                    ]
                    
                    for fallback_version, fallback_model in fallback_models:
                        try:
                            print(f"DEBUG: Fallback 시도 - 버전: {fallback_version}, 모델: {fallback_model}")
                            fallback_url = f"https://generativelanguage.googleapis.com/{fallback_version}/models/{fallback_model}:generateContent?key={api_key}"
                            fallback_response = requests.post(fallback_url, json=payload, timeout=30)
                            print(f"DEBUG: Fallback 응답 상태 코드: {fallback_response.status_code}")
                            
                            if fallback_response.status_code == 200:
                                fallback_response.raise_for_status()
                                fallback_result = fallback_response.json()
                                
                                if 'candidates' in fallback_result and len(fallback_result['candidates']) > 0:
                                    content = fallback_result['candidates'][0].get('content', {})
                                    parts = content.get('parts', [])
                                    if parts and len(parts) > 0:
                                        text = parts[0].get('text', '')
                                        print(f"DEBUG: Fallback 성공! 모델: {fallback_model}, 텍스트 길이: {len(text)} 문자")
                                        # 마크다운 형식 제거
                                        import re
                                        text = text.replace('###', '').replace('**', '').replace('---', '').replace('##', '')
                                        text = re.sub(r'\n{3,}', '\n\n', text)
                                        text = re.sub(r' {2,}', ' ', text)
                                        text = text.strip()
                                        return text
                            else:
                                print(f"DEBUG: Fallback 실패 - 상태 코드: {fallback_response.status_code}")
                        except Exception as fallback_error:
                            print(f"DEBUG: Fallback 실패 ({fallback_model}): {fallback_error}")
                            continue
                    
                    print("DEBUG: 모든 대체 모델 시도 실패")
            except:
                print(f"DEBUG: 응답 텍스트: {e.response.text[:500]}")
        return None
    except Exception as e:
        print(f"DEBUG: Gemini API 예상치 못한 오류: {e}")
        import traceback
        print(f"DEBUG: 상세 오류: {traceback.format_exc()}")
        return None


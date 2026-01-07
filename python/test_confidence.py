#!/usr/bin/env python3
"""
Confidence 계산 공식 단위 테스트
"""

import numpy as np
from scipy.stats import norm

def compute_confidence_rate(xC, nC, xV, nV):
    """
    비율에 대한 신뢰도 계산 (two-sided z-test, unpooled)
    """
    if nC == 0 or nV == 0:
        return None, 0.0
    
    pC = xC / nC if nC > 0 else 0
    pV = xV / nV if nV > 0 else 0
    
    if pC == 0 and pV == 0:
        return None, 0.0
    
    se = np.sqrt((pV * (1 - pV) / nV) + (pC * (1 - pC) / nC))
    
    if se == 0:
        return None, 0.0
    
    z = (pV - pC) / se
    p_value = 2 * (1 - norm.cdf(abs(z)))
    confidence = (1 - p_value) * 100
    
    return pC, confidence

def test_confidence():
    """테스트 케이스"""
    # 테스트 케이스 1: 명확한 차이
    # Control: 1000 중 100 (10%), Variation: 1000 중 150 (15%)
    pC, conf = compute_confidence_rate(100, 1000, 150, 1000)
    print(f"Test 1 - Control: 100/1000 (10%), Variation: 150/1000 (15%)")
    print(f"  pC: {pC:.4f}, Confidence: {conf:.2f}%")
    assert conf > 90, "높은 신뢰도가 예상됩니다"
    
    # 테스트 케이스 2: 작은 차이
    # Control: 1000 중 100 (10%), Variation: 1000 중 105 (10.5%)
    pC, conf = compute_confidence_rate(100, 1000, 105, 1000)
    print(f"\nTest 2 - Control: 100/1000 (10%), Variation: 105/1000 (10.5%)")
    print(f"  pC: {pC:.4f}, Confidence: {conf:.2f}%")
    
    # 테스트 케이스 3: 큰 샘플, 작은 차이
    # Control: 10000 중 1000 (10%), Variation: 10000 중 1020 (10.2%)
    pC, conf = compute_confidence_rate(1000, 10000, 1020, 10000)
    print(f"\nTest 3 - Control: 1000/10000 (10%), Variation: 1020/10000 (10.2%)")
    print(f"  pC: {pC:.4f}, Confidence: {conf:.2f}%")
    
    # 테스트 케이스 4: 동일한 비율
    # Control: 1000 중 100 (10%), Variation: 1000 중 100 (10%)
    pC, conf = compute_confidence_rate(100, 1000, 100, 1000)
    print(f"\nTest 4 - Control: 100/1000 (10%), Variation: 100/1000 (10%)")
    print(f"  pC: {pC:.4f}, Confidence: {conf:.2f}%")
    assert conf == 0.0, "동일한 비율이면 confidence는 0이어야 합니다"
    
    print("\n모든 테스트 통과!")

if __name__ == '__main__':
    test_confidence()


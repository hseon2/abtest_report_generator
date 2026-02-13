interface StepIndicatorProps {
  currentStep: number
}

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  const steps = [
    { num: 1, label: '파일 업로드' },
    { num: 2, label: '테스트 조건 설정' },
    { num: 3, label: 'KPI 설정' },
    { num: 4, label: '분석 결과' },
  ]

  return (
    <div style={{ 
      backgroundColor: '#f8f9fa', 
      padding: '15px 20px', 
      borderBottom: '2px solid #e0e0e0',
      display: 'flex',
      justifyContent: 'center',
      gap: '10px'
    }}>
      {steps.map((step, index) => (
        <div key={step.num} style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '20px',
            backgroundColor: currentStep === step.num ? '#3498db' : currentStep > step.num ? '#2ecc71' : '#e0e0e0',
            color: currentStep >= step.num ? 'white' : '#7f8c8d',
            fontWeight: currentStep === step.num ? 'bold' : 'normal',
            fontSize: '14px',
            transition: 'all 0.3s'
          }}>
            <span style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              backgroundColor: currentStep === step.num ? 'white' : currentStep > step.num ? 'white' : 'transparent',
              color: currentStep === step.num ? '#3498db' : currentStep > step.num ? '#2ecc71' : '#7f8c8d',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              fontSize: '12px'
            }}>
              {currentStep > step.num ? '✓' : step.num}
            </span>
            <span>{step.label}</span>
          </div>
          {index < steps.length - 1 && (
            <div style={{
              width: '30px',
              height: '2px',
              backgroundColor: currentStep > step.num ? '#2ecc71' : '#e0e0e0',
              margin: '0 5px',
              transition: 'all 0.3s'
            }} />
          )}
        </div>
      ))}
    </div>
  )
}



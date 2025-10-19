import React from 'react';
import styles from './ProgressBar.module.css';

type Step = 'order-confirm' | 'payment-method' | 'payment-complete';

interface ProgressBarProps {
  currentStep: Step;
}

const steps: { id: Step; title: string }[] = [
  { id: 'order-confirm', title: '주문 확인' },
  { id: 'payment-method', title: '결제 방법' },
  { id: 'payment-complete', title: '완료' },
];

export default function ProgressBar({ currentStep }: ProgressBarProps) {
  const currentStepIndex = steps.findIndex(step => step.id === currentStep);

  return (
    <div className={styles.progressBar}>
      {steps.map((step, index) => {
        const isCompleted = index < currentStepIndex;
        const isActive = index === currentStepIndex;

        const stepClasses = [
          styles.progressStep,
          isCompleted ? styles.completed : '',
          isActive ? styles.active : '',
        ].join(' ');

        return (
          <div key={step.id} className={stepClasses}>
            {isCompleted ? (
              // 텍스트 대신 SVG 체크 아이콘을 사용합니다.
              <svg className={styles.checkIcon} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              step.title
            )}
          </div>
        );
      })}
    </div>
  );
}
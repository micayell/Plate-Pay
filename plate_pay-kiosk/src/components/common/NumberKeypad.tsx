import React, { useEffect, useState } from 'react';
import styles from './NumberKeypad.module.css'; // CSS 모듈 import

interface NumberKeypadProps {
  onNumberClick: (number: string) => void;
  onBackspace: () => void;
  onSubmit: () => void;
  submitLabel: string;
  isSubmitDisabled?: boolean;
  randomize?: boolean;
}

export default function NumberKeypad({
  onNumberClick,
  onBackspace,
  onSubmit,
  submitLabel,
  isSubmitDisabled = false,
  randomize = false,
}: NumberKeypadProps) {
  const [keys, setKeys] = useState<(string | null)[]>([]);

  useEffect(() => {
    const numbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
    if (randomize) {
      for (let i = numbers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
      }
    }
    const newKeys = [
        ...numbers.slice(0, 9),
        '←',
        numbers[9],
        submitLabel
    ];
    setKeys(newKeys);
  }, [randomize, submitLabel]);


  const handleKeyClick = (key: string) => {
    if (key === '←') {
      onBackspace();
    } else if (key === submitLabel) {
        onSubmit();
    } else {
      onNumberClick(key);
    }
  };

  // CSS 모듈 클래스 이름을 반환하도록 수정
  const getSpecialKeyClass = (key: string) => {
    if (key === submitLabel) return styles.keypadSubmitButton;
    if (key === '←') return styles.keypadActionButton;
    return styles.keypadButton;
  }

  return (
    // 전역 클래스 이름 대신 CSS 모듈 스타일 적용
    <div className={styles.numberKeypad}>
      <div className={styles.keypadGrid}>
        {keys.map((key, index) => (
          <button
            key={index}
            onClick={() => key && handleKeyClick(key)}
            disabled={key === submitLabel && isSubmitDisabled}
            className={key ? getSpecialKeyClass(key) : styles.keypadEmpty}
          >
            {key}
          </button>
        ))}
      </div>
    </div>
  );
}
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import styles from './TypingAnalyzer.module.css'

const WORDS_LIST = [
  "dasturlash", "kompyuter", "algoritm", "ma'lumot", "dastur", "kod", "funksiya", "o'zgaruvchi",
  "tezlik", "aniqlik", "qobiliyat", "ko'nikma", "bilim", "tajriba", "loyiha", "vazifa",
  "yechim", "muammo", "mantiq", "struktura", "sintaksis", "semantika", "interfeys", "backend",
  "frontend", "database", "server", "client", "api", "framework", "library", "component",
  "state", "props", "hook", "effect", "render", "update", "optimize", "performance",
  "javascript", "typescript", "react", "nextjs", "nodejs", "python", "java", "html",
  "css", "json", "xml", "http", "https", "url", "domain", "hosting", "deploy", "build",
  "test", "debug", "error", "warning", "log", "console", "browser", "developer",
  "version", "control", "git", "github", "commit", "branch", "merge", "pull", "push"
]

type Mode = 'time' | 'words'
type TimeOption = 15 | 30 | 60 | 120
type WordsOption = 10 | 25 | 50 | 100

interface Stats {
  wpm: number
  accuracy: number
  errors: number
  correctChars: number
  totalChars: number
  rawWpm: number
  consistency: number
}

export default function TypingAnalyzer() {
  const [mode, setMode] = useState<Mode>('time')
  const [timeOption, setTimeOption] = useState<TimeOption>(60)
  const [wordsOption, setWordsOption] = useState<WordsOption>(25)
  const [words, setWords] = useState<string[]>([])
  const [userInput, setUserInput] = useState('')
  const [startTime, setStartTime] = useState<number | null>(null)
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [stats, setStats] = useState<Stats>({
    wpm: 0,
    accuracy: 100,
    errors: 0,
    correctChars: 0,
    totalChars: 0,
    rawWpm: 0,
    consistency: 100
  })
  const [isFinished, setIsFinished] = useState(false)
  const [isTestActive, setIsTestActive] = useState(false)
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [currentCharIndex, setCurrentCharIndex] = useState(0)
  const [wpmHistory, setWpmHistory] = useState<number[]>([])
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const timerStartedRef = useRef<boolean>(false)

  const generateWords = useCallback((count: number) => {
    const generated: string[] = []
    for (let i = 0; i < count; i++) {
      generated.push(WORDS_LIST[Math.floor(Math.random() * WORDS_LIST.length)])
    }
    return generated
  }, [])

  const initializeTest = useCallback(() => {
    // Clear timer
    timerStartedRef.current = false
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    
    if (mode === 'time') {
      const wordCount = Math.max(50, timeOption * 5) // Generate enough words for time mode
      setWords(generateWords(wordCount))
      setTimeLeft(timeOption)
    } else {
      setWords(generateWords(wordsOption))
      setTimeLeft(null)
    }
    setUserInput('')
    setStartTime(null)
    setCurrentWordIndex(0)
    setCurrentCharIndex(0)
    setIsFinished(false)
    setIsTestActive(false)
    setWpmHistory([])
    setStats({
      wpm: 0,
      accuracy: 100,
      errors: 0,
      correctChars: 0,
      totalChars: 0,
      rawWpm: 0,
      consistency: 100
    })
  }, [mode, timeOption, wordsOption, generateWords])

  useEffect(() => {
    initializeTest()
  }, [initializeTest])

  const calculateStats = useCallback(() => {
    if (!startTime || !isTestActive) return

    const elapsed = (Date.now() - startTime) / 1000 / 60 // minutes
    if (elapsed <= 0) return

    const userWords = userInput.trim().split(/\s+/).filter(w => w.length > 0)
    const targetWords = words.slice(0, Math.max(currentWordIndex + 1, userWords.length))
    
    let correctChars = 0
    let totalChars = 0
    let errors = 0

    // Compare word by word
    for (let i = 0; i < userWords.length; i++) {
      const userWord = userWords[i]
      const targetWord = targetWords[i] || ''
      
      for (let j = 0; j < Math.max(userWord.length, targetWord.length); j++) {
        totalChars++
        if (j < userWord.length && j < targetWord.length) {
          if (userWord[j] === targetWord[j]) {
            correctChars++
          } else {
            errors++
          }
        } else {
          errors++
        }
      }
      
      // Add space after word (except last word)
      if (i < userWords.length - 1) {
        totalChars++
        correctChars++
      }
    }

    // Add spaces between words in input
    const spacesInInput = userInput.split('').filter(c => c === ' ').length
    if (spacesInInput > userWords.length - 1) {
      totalChars += spacesInInput - (userWords.length - 1)
      errors += spacesInInput - (userWords.length - 1)
    }

    const rawWpm = Math.round((totalChars / 5) / elapsed)
    const wpm = Math.round((correctChars / 5) / elapsed)
    const accuracy = totalChars > 0 ? Math.round((correctChars / totalChars) * 100) : 100

    // Calculate consistency (based on last 10 WPM values)
    const newWpmHistory = [...wpmHistory, wpm].slice(-10)
    setWpmHistory(newWpmHistory)
    
    let consistency = 100
    if (newWpmHistory.length > 1) {
      const avgWpm = newWpmHistory.reduce((a, b) => a + b, 0) / newWpmHistory.length
      if (avgWpm > 0) {
        const variance = newWpmHistory.reduce((acc, val) => acc + Math.pow(val - avgWpm, 2), 0) / newWpmHistory.length
        const stdDev = Math.sqrt(variance)
        consistency = Math.max(0, Math.round(100 - (stdDev / avgWpm) * 100))
      }
    }

    setStats({
      wpm,
      accuracy,
      errors,
      correctChars,
      totalChars,
      rawWpm,
      consistency
    })

    // Check if words mode is finished
    if (mode === 'words' && userWords.length >= words.length) {
      const lastWord = words[words.length - 1]
      const lastTypedWord = userWords[userWords.length - 1]
      if (lastTypedWord === lastWord || lastTypedWord.length >= lastWord.length) {
        setIsFinished(true)
        setIsTestActive(false)
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
        }
      }
    }
  }, [userInput, words, startTime, isTestActive, currentWordIndex, mode, wpmHistory])

  useEffect(() => {
    // Only start timer in time mode when test becomes active
    if (mode === 'time' && isTestActive && timeLeft !== null && timeLeft > 0 && !timerStartedRef.current) {
      timerStartedRef.current = true
      
      // Clear any existing interval first
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev === null || prev === undefined || prev <= 1) {
            setIsFinished(true)
            setIsTestActive(false)
            timerStartedRef.current = false
            if (intervalRef.current) {
              clearInterval(intervalRef.current)
              intervalRef.current = null
            }
            // Calculate final stats when time runs out
            setTimeout(() => {
              calculateStats()
            }, 100)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else if (!isTestActive || mode !== 'time') {
      // Clear interval when test is not active or mode changes
      timerStartedRef.current = false
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [mode, isTestActive, calculateStats])

  useEffect(() => {
    if (isTestActive && !isFinished) {
      const interval = setInterval(calculateStats, 100)
      return () => clearInterval(interval)
    }
  }, [isTestActive, isFinished, calculateStats])

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value

    if (isFinished) return

    if (!isTestActive && value.length > 0) {
      setIsTestActive(true)
      setStartTime(Date.now())
    }

    setUserInput(value)

    // Handle word completion
    const wordsTyped = value.trim().split(/\s+/).filter(w => w.length > 0)
    if (wordsTyped.length > currentWordIndex) {
      setCurrentWordIndex(Math.min(wordsTyped.length - 1, words.length - 1))
    }
    
    // Update current character index
    if (wordsTyped.length > 0 && currentWordIndex < words.length) {
      const currentWord = words[currentWordIndex] || ''
      const currentInput = wordsTyped[currentWordIndex] || ''
      setCurrentCharIndex(Math.min(currentInput.length, currentWord.length))
    }
  }

  const handleRestart = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    initializeTest()
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const renderWords = () => {
    const userWords = userInput.trim().split(/\s+/).filter(w => w.length > 0)
    
    return words.map((word, wordIdx) => {
      const isCurrentWord = wordIdx === currentWordIndex
      const isPastWord = wordIdx < currentWordIndex
      const userWord = userWords[wordIdx] || ''
      const isWordComplete = isPastWord && userWords[wordIdx] === word
      const isWordIncorrect = isPastWord && userWords[wordIdx] && userWords[wordIdx] !== word
      
      return (
        <span 
          key={wordIdx} 
          className={`${styles.word} ${isPastWord ? styles.wordPast : ''} ${isCurrentWord ? styles.wordCurrent : ''} ${isWordComplete ? styles.wordComplete : ''} ${isWordIncorrect ? styles.wordIncorrect : ''}`}
        >
          {word.split('').map((char, charIdx) => {
            let charClass = styles.char
            if (isPastWord) {
              const pastUserWord = userWords[wordIdx] || ''
              if (charIdx < pastUserWord.length) {
                charClass += pastUserWord[charIdx] === char ? ` ${styles.charCorrect}` : ` ${styles.charIncorrect}`
              } else if (pastUserWord.length < word.length) {
                charClass += ` ${styles.charIncorrect}`
              } else {
                charClass += ` ${styles.charCorrect}`
              }
            } else if (isCurrentWord) {
              if (charIdx < userWord.length) {
                charClass += userWord[charIdx] === char ? ` ${styles.charCorrect}` : ` ${styles.charIncorrect}`
              } else if (charIdx === userWord.length) {
                // Show caret at the current position
                charClass += ` ${styles.charCurrent}`
              }
            } else {
              // Future words stay in default color
              charClass += ` ${styles.charFuture}`
            }
            return (
              <span key={charIdx} className={charClass}>
                {char === ' ' ? '\u00A0' : char}
              </span>
            )
          })}
          {wordIdx < words.length - 1 && <span className={styles.space}>&nbsp;</span>}
        </span>
      )
    })
  }

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        <div className={styles.header}>
          <div className={styles.modeSelector}>
            <button
              className={`${styles.modeButton} ${mode === 'time' ? styles.modeButtonActive : ''}`}
              onClick={() => {
                setMode('time')
                setTimeout(initializeTest, 0)
              }}
            >
              Time
            </button>
            <button
              className={`${styles.modeButton} ${mode === 'words' ? styles.modeButtonActive : ''}`}
              onClick={() => {
                setMode('words')
                setTimeout(initializeTest, 0)
              }}
            >
              Words
            </button>
          </div>

          <div className={styles.options}>
            {mode === 'time' ? (
              <>
                {([15, 30, 60, 120] as TimeOption[]).map((opt) => (
                  <button
                    key={opt}
                    className={`${styles.optionButton} ${timeOption === opt ? styles.optionButtonActive : ''}`}
                    onClick={() => {
                      setTimeOption(opt)
                      setTimeout(initializeTest, 0)
                    }}
                  >
                    {opt}
                  </button>
                ))}
              </>
            ) : (
              <>
                {([10, 25, 50, 100] as WordsOption[]).map((opt) => (
                  <button
                    key={opt}
                    className={`${styles.optionButton} ${wordsOption === opt ? styles.optionButtonActive : ''}`}
                    onClick={() => {
                      setWordsOption(opt)
                      setTimeout(initializeTest, 0)
                    }}
                  >
                    {opt}
                  </button>
                ))}
              </>
            )}
          </div>
        </div>

        <div className={styles.statsBar}>
          <div className={styles.stat}>
            <div className={styles.statLabel}>wpm</div>
            <div className={styles.statValue}>{stats.wpm}</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statLabel}>acc</div>
            <div className={styles.statValue}>{stats.accuracy}%</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statLabel}>raw</div>
            <div className={styles.statValue}>{stats.rawWpm}</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statLabel}>consistency</div>
            <div className={styles.statValue}>{stats.consistency}%</div>
          </div>
          {mode === 'time' && timeLeft !== null && (
            <div className={styles.stat}>
              <div className={styles.statLabel}>time</div>
              <div className={styles.statValue}>{formatTime(timeLeft)}</div>
            </div>
          )}
          {mode === 'words' && (
            <div className={styles.stat}>
              <div className={styles.statLabel}>words</div>
              <div className={styles.statValue}>{currentWordIndex + 1}/{words.length}</div>
            </div>
          )}
        </div>

        <div className={styles.testContainer}>
          <div className={styles.wordsDisplay}>
            {renderWords()}
          </div>
          <div className={styles.inputWrapper}>
            <textarea
              ref={inputRef}
              className={styles.input}
              value={userInput}
              onChange={handleInput}
              placeholder=""
              disabled={isFinished}
              autoFocus
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              onKeyDown={(e) => {
                if (e.key === 'Tab') {
                  e.preventDefault()
                  if (isFinished) {
                    handleRestart()
                  }
                }
                if (e.key === 'Escape' && !isFinished && isTestActive) {
                  e.preventDefault()
                  handleRestart()
                }
              }}
            />
          </div>
        </div>

        {isFinished && (
          <div className={styles.resultScreen}>
            <div className={styles.resultTitle}>Test yakunlandi</div>
            <div className={styles.resultStats}>
              <div className={styles.resultStat}>
                <div className={styles.resultStatValue}>{stats.wpm}</div>
                <div className={styles.resultStatLabel}>wpm</div>
              </div>
              <div className={styles.resultStat}>
                <div className={styles.resultStatValue}>{stats.accuracy}%</div>
                <div className={styles.resultStatLabel}>accuracy</div>
              </div>
              <div className={styles.resultStat}>
                <div className={styles.resultStatValue}>{stats.rawWpm}</div>
                <div className={styles.resultStatLabel}>raw</div>
              </div>
              <div className={styles.resultStat}>
                <div className={styles.resultStatValue}>{stats.consistency}%</div>
                <div className={styles.resultStatLabel}>consistency</div>
              </div>
            </div>
            <button className={styles.restartButton} onClick={handleRestart} autoFocus>
              Testni qayta boshlash (Tab)
            </button>
          </div>
        )}

        {!isFinished && userInput.length === 0 && (
          <div className={styles.startHint}>
            Yozishni boshlash uchun har qanday tugmani bosing
          </div>
        )}
      </div>
    </div>
  )
}

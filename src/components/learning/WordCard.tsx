'use client';

import { useState, useEffect } from 'react';
import { Volume2, Eye } from 'lucide-react';
import { clsx } from 'clsx';

export type LearningMode = 'eng_to_jpn' | 'jpn_to_eng' | 'audio_recognition' | 'context_fill';

interface WordCardProps {
  word: {
    id: string;
    english: string;
    japanese: string;
    phonetic?: string;
    partOfSpeech: string;
    examples: Array<{
      id: string;
      english: string;
      japanese: string;
      difficulty: number;
    }>;
  };
  mode: LearningMode;
  onAnswer: (correct: boolean, difficulty: number, responseTime: number, hintsUsed: number) => void;
  showHint?: boolean;
}

export default function WordCard({ word, mode, onAnswer, showHint = false }: WordCardProps) {
  const [phase, setPhase] = useState<'question' | 'thinking' | 'answer'>('question');
  const [startTime, setStartTime] = useState<number>(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [showPhonetic, setShowPhonetic] = useState(false);
  const [showExample, setShowExample] = useState(false);
  const [userAnswer, setUserAnswer] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<number>(3);

  useEffect(() => {
    setStartTime(Date.now());
    setPhase('question');
    setHintsUsed(0);
    setShowPhonetic(false);
    setShowExample(false);
    setUserAnswer('');
    setSelectedDifficulty(3);
  }, [word, mode]);

  const handleShowAnswer = () => {
    setPhase('answer');
  };

  const handleAnswer = (correct: boolean) => {
    const responseTime = Date.now() - startTime;
    onAnswer(correct, selectedDifficulty, responseTime, hintsUsed);
  };

  const handleHint = (type: 'phonetic' | 'example') => {
    setHintsUsed(prev => prev + 1);
    if (type === 'phonetic') setShowPhonetic(true);
    if (type === 'example') setShowExample(true);
  };

  const playAudio = () => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(word.english);
      utterance.lang = 'en-US';
      utterance.rate = 0.8;
      speechSynthesis.speak(utterance);
    }
  };

  const renderQuestion = () => {
    switch (mode) {
      case 'eng_to_jpn':
        return (
          <div className="text-center">
            <div className="glass rounded-2xl p-6 mb-6 inline-block glow">
              <div className="text-5xl font-bold mb-3 text-white">{word.english}</div>
              <div className="text-lg text-white/70">({word.partOfSpeech})</div>
            </div>
            {showPhonetic && word.phonetic && (
              <div className="glass-light rounded-xl p-4 mb-6 inline-block">
                <div className="text-xl text-white font-mono">/{word.phonetic}/</div>
              </div>
            )}
            <button
              onClick={playAudio}
              className="glass-button flex items-center gap-3 mx-auto px-6 py-4 rounded-xl text-white font-medium hover:scale-105 transition-all duration-300"
            >
              <Volume2 size={20} />
              発音を聞く
            </button>
          </div>
        );
      
      case 'jpn_to_eng':
        return (
          <div className="text-center">
            <div className="glass rounded-2xl p-6 mb-6 inline-block glow">
              <div className="text-5xl font-bold mb-3 text-white">{word.japanese}</div>
              <div className="text-lg text-white/70">({word.partOfSpeech})</div>
            </div>
            {showExample && word.examples.length > 0 && (
              <div className="glass-light rounded-xl p-6 mb-6 max-w-lg mx-auto">
                <div className="text-lg font-medium text-white mb-2">{word.examples[0].japanese}</div>
                <div className="text-white/60 text-sm">{word.examples[0].english}</div>
              </div>
            )}
          </div>
        );
      
      case 'audio_recognition':
        return (
          <div className="text-center">
            <div className="glass-light rounded-2xl p-6 mb-8">
              <div className="text-xl text-white mb-6">音声を聞いて、英単語と意味を答えてください</div>
              <button
                onClick={playAudio}
                className="glass-button flex items-center gap-3 mx-auto px-8 py-4 rounded-xl text-white font-medium hover:scale-105 transition-all duration-300"
              >
                <Volume2 size={24} />
                音声を再生
              </button>
            </div>
            <div className="mt-6">
              <input
                type="text"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                placeholder="英単語を入力..."
                className="glass-input w-full max-w-md p-4 rounded-xl text-center text-lg font-medium"
                onKeyPress={(e) => e.key === 'Enter' && handleShowAnswer()}
              />
            </div>
          </div>
        );
      
      case 'context_fill':
        if (word.examples.length === 0) return null;
        const example = word.examples[0];
        const blankedExample = example.english.replace(new RegExp(word.english, 'gi'), '______');
        
        return (
          <div className="text-center">
            <div className="glass-light rounded-2xl p-6 mb-8">
              <div className="text-xl text-white mb-6">文脈から適切な単語を推測してください</div>
              <div className="glass rounded-xl p-6">
                <div className="text-xl font-medium mb-3 text-white">{blankedExample}</div>
                <div className="text-lg text-white/70">{example.japanese}</div>
              </div>
            </div>
            <input
              type="text"
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              placeholder="単語を入力..."
              className="glass-input w-full max-w-md p-4 rounded-xl text-center text-lg font-medium"
              onKeyPress={(e) => e.key === 'Enter' && handleShowAnswer()}
            />
          </div>
        );
    }
  };

  const renderAnswer = () => {
    return (
      <div className="text-center">
        <div className="mb-8">
          <div className="glass rounded-2xl p-8 mb-6 glow">
            <div className="text-4xl font-bold mb-3 text-white">{word.english}</div>
            <div className="text-3xl text-gradient mb-3">{word.japanese}</div>
            <div className="text-lg text-white/70 mb-2">({word.partOfSpeech})</div>
            {word.phonetic && (
              <div className="text-xl text-white/60 font-mono">/{word.phonetic}/</div>
            )}
          </div>
        </div>

        {word.examples.length > 0 && (
          <div className="glass-light rounded-2xl p-6 mb-8 max-w-2xl mx-auto">
            <div className="text-lg font-medium mb-2 text-white">{word.examples[0].english}</div>
            <div className="text-white/70">{word.examples[0].japanese}</div>
          </div>
        )}

        <div className="mb-8">
          <div className="glass-light rounded-xl p-4 mb-6 inline-block">
            <div className="text-lg text-white">この単語の難易度は？</div>
          </div>
          <div className="flex justify-center gap-3 flex-wrap">
            {[1, 2, 3, 4, 5].map((num) => (
              <button
                key={num}
                onClick={() => setSelectedDifficulty(num)}
                className={clsx(
                  "px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 hover:scale-105",
                  selectedDifficulty === num
                    ? "glass-strong text-white glow"
                    : "glass text-white/80 hover:glass-strong"
                )}
              >
                {num === 1 ? '簡単' : num === 2 ? 'やや簡単' : num === 3 ? '普通' : num === 4 ? 'やや難しい' : '難しい'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-center gap-6">
          <button
            onClick={() => handleAnswer(false)}
            className="glass-button px-8 py-4 rounded-xl text-white font-medium hover:scale-105 transition-all duration-300"
          >
            わからなかった
          </button>
          <button
            onClick={() => handleAnswer(true)}
            className="glass-button px-8 py-4 rounded-xl text-white font-medium hover:scale-105 transition-all duration-300 glow"
          >
            答えられた！
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="glass-strong rounded-3xl p-10">
        {phase === 'question' && (
          <>
            {renderQuestion()}
            
            <div className="mt-10 flex justify-center gap-4 flex-wrap">
              {showHint && !showPhonetic && word.phonetic && mode === 'eng_to_jpn' && (
                <button
                  onClick={() => handleHint('phonetic')}
                  className="glass-button flex items-center gap-3 px-6 py-3 rounded-xl text-white font-medium hover:scale-105 transition-all duration-300"
                >
                  <Eye size={18} />
                  発音を見る
                </button>
              )}
              
              {showHint && !showExample && word.examples.length > 0 && mode === 'jpn_to_eng' && (
                <button
                  onClick={() => handleHint('example')}
                  className="glass-button flex items-center gap-3 px-6 py-3 rounded-xl text-white font-medium hover:scale-105 transition-all duration-300"
                >
                  <Eye size={18} />
                  例文を見る
                </button>
              )}
              
              <button
                onClick={handleShowAnswer}
                className="glass-button px-8 py-4 rounded-xl text-white font-bold text-lg glow hover:scale-105 transition-all duration-300"
              >
                {mode === 'audio_recognition' || mode === 'context_fill' ? '答えを確認' : '答えを見る'}
              </button>
            </div>
          </>
        )}

        {phase === 'answer' && renderAnswer()}

        {hintsUsed > 0 && (
          <div className="mt-6 text-center">
            <div className="glass-light rounded-xl p-3 inline-block">
              <span className="text-sm text-white/80">ヒント使用: {hintsUsed}回</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
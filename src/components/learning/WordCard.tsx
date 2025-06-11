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
            <div className="text-4xl font-bold mb-2">{word.english}</div>
            <div className="text-sm text-gray-600 mb-4">({word.partOfSpeech})</div>
            {showPhonetic && word.phonetic && (
              <div className="text-lg text-blue-600 mb-4">/{word.phonetic}/</div>
            )}
            <button
              onClick={playAudio}
              className="flex items-center gap-2 mx-auto px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 mb-4"
            >
              <Volume2 size={16} />
              発音を聞く
            </button>
          </div>
        );
      
      case 'jpn_to_eng':
        return (
          <div className="text-center">
            <div className="text-4xl font-bold mb-2">{word.japanese}</div>
            <div className="text-sm text-gray-600 mb-4">({word.partOfSpeech})</div>
            {showExample && word.examples.length > 0 && (
              <div className="text-sm bg-gray-100 p-3 rounded-lg mb-4">
                <div className="font-medium">{word.examples[0].japanese}</div>
                <div className="text-gray-600 text-xs mt-1">{word.examples[0].english}</div>
              </div>
            )}
          </div>
        );
      
      case 'audio_recognition':
        return (
          <div className="text-center">
            <div className="text-lg mb-4">音声を聞いて、英単語と意味を答えてください</div>
            <button
              onClick={playAudio}
              className="flex items-center gap-2 mx-auto px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 mb-4"
            >
              <Volume2 size={20} />
              音声を再生
            </button>
            <div className="mt-4">
              <input
                type="text"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                placeholder="英単語を入力..."
                className="w-full p-3 border rounded-lg text-center text-lg"
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
            <div className="text-lg mb-4">文脈から適切な単語を推測してください</div>
            <div className="bg-gray-100 p-4 rounded-lg mb-4">
              <div className="text-lg font-medium mb-2">{blankedExample}</div>
              <div className="text-sm text-gray-600">{example.japanese}</div>
            </div>
            <input
              type="text"
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              placeholder="単語を入力..."
              className="w-full p-3 border rounded-lg text-center text-lg"
              onKeyPress={(e) => e.key === 'Enter' && handleShowAnswer()}
            />
          </div>
        );
    }
  };

  const renderAnswer = () => {
    return (
      <div className="text-center">
        <div className="mb-6">
          <div className="text-3xl font-bold mb-2">{word.english}</div>
          <div className="text-2xl text-blue-600 mb-2">{word.japanese}</div>
          <div className="text-sm text-gray-600 mb-2">({word.partOfSpeech})</div>
          {word.phonetic && (
            <div className="text-lg text-gray-500">/{word.phonetic}/</div>
          )}
        </div>

        {word.examples.length > 0 && (
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <div className="font-medium mb-1">{word.examples[0].english}</div>
            <div className="text-gray-600 text-sm">{word.examples[0].japanese}</div>
          </div>
        )}

        <div className="mb-6">
          <div className="text-sm text-gray-600 mb-2">この単語の難易度は？</div>
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((num) => (
              <button
                key={num}
                onClick={() => setSelectedDifficulty(num)}
                className={clsx(
                  "px-3 py-1 rounded text-sm font-medium",
                  selectedDifficulty === num
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                )}
              >
                {num === 1 ? '簡単' : num === 2 ? 'やや簡単' : num === 3 ? '普通' : num === 4 ? 'やや難しい' : '難しい'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-center gap-4">
          <button
            onClick={() => handleAnswer(false)}
            className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium"
          >
            わからなかった
          </button>
          <button
            onClick={() => handleAnswer(true)}
            className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium"
          >
            答えられた！
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-lg">
      {phase === 'question' && (
        <>
          {renderQuestion()}
          
          <div className="mt-8 flex justify-center gap-4">
            {showHint && !showPhonetic && word.phonetic && mode === 'eng_to_jpn' && (
              <button
                onClick={() => handleHint('phonetic')}
                className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
              >
                <Eye size={16} />
                発音を見る
              </button>
            )}
            
            {showHint && !showExample && word.examples.length > 0 && mode === 'jpn_to_eng' && (
              <button
                onClick={() => handleHint('example')}
                className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
              >
                <Eye size={16} />
                例文を見る
              </button>
            )}
            
            <button
              onClick={handleShowAnswer}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium"
            >
              {mode === 'audio_recognition' || mode === 'context_fill' ? '答えを確認' : '答えを見る'}
            </button>
          </div>
        </>
      )}

      {phase === 'answer' && renderAnswer()}

      {hintsUsed > 0 && (
        <div className="mt-4 text-center text-sm text-gray-500">
          ヒント使用: {hintsUsed}回
        </div>
      )}
    </div>
  );
}
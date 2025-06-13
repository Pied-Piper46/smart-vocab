'use client';

import { useState, useEffect } from 'react';
import { Volume2 } from 'lucide-react';

export type LearningMode = 'eng_to_jpn' | 'jpn_to_eng' | 'audio_recognition' | 'context_fill';

import { WordData } from '@/lib/api-client';

interface WordCardProps {
  word: WordData;
  mode: LearningMode;
  onAnswer: (correct: boolean) => void;
}

export default function WordCard({ word, mode, onAnswer }: WordCardProps) {
  const [phase, setPhase] = useState<'question' | 'thinking' | 'answer'>('question');
  const [userAnswer, setUserAnswer] = useState('');

  useEffect(() => {
    setPhase('question');
    setUserAnswer('');
  }, [word, mode]);

  const handleShowAnswer = () => {
    setPhase('answer');
  };

  const handleAnswer = (correct: boolean) => {
    onAnswer(correct);
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
            <div className="flex items-center justify-center gap-4 mb-6">
              <button
                onClick={playAudio}
                className="glass-button p-2.5 rounded-xl text-white hover:scale-101 transition-all duration-300"
              >
                <Volume2 size={24} />
              </button>
              <div className="text-5xl font-bold text-white">{word.english}</div>
              <div className="w-10"></div> {/* Spacer to keep text centered */}
            </div>
            <div className="text-lg text-white/70">({word.partOfSpeech})</div>
          </div>
        );
      
      case 'jpn_to_eng':
        return (
          <div className="text-center">
            <div className="text-5xl font-bold mb-3 text-white">{word.japanese}</div>
            <div className="text-lg text-white/70">({word.partOfSpeech})</div>
          </div>
        );
      
      case 'audio_recognition':
        return (
          <div className="text-center">
            <div className="text-xl text-white mb-6">音声を聞いて、英単語と意味を答えてください</div>
            <button
              onClick={playAudio}
              className="glass-button flex items-center gap-3 mx-auto px-8 py-4 mb-10 rounded-xl text-white font-medium hover:scale-101 transition-all duration-300"
            >
              <Volume2 size={24} />
              音声を再生
            </button>
            <div className="mt-6">
              <input
                type="text"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                placeholder="英単語を入力..."
                className="glass-input w-full max-w-md p-4 rounded-xl text-center text-lg font-medium"
                onKeyDown={(e) => e.key === 'Enter' && handleShowAnswer()}
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
            <div className="text-xl text-white mb-6">文脈から適切な単語を推測してください</div>
            <div className="glass rounded-xl p-6 mb-10">
              <div className="text-xl font-medium mb-3 text-white">{blankedExample}</div>
              <div className="text-lg text-white/70">{example.japanese}</div>
            </div>
            <input
              type="text"
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              placeholder="単語を入力..."
              className="glass-input w-full max-w-md p-4 rounded-xl text-center text-lg font-medium"
              onKeyDown={(e) => e.key === 'Enter' && handleShowAnswer()}
            />
          </div>
        );
    }
  };

  const renderAnswer = () => {
    return (
      <div className="text-center">
        <div className="mb-8">
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={playAudio}
              className="glass-button p-2.5 rounded-xl text-white hover:scale-101 transition-all duration-300"
            >
              <Volume2 size={24} />
            </button>
            <div className="text-5xl font-bold text-white mb-1">{word.english}</div>
            <div className="w-10"></div> {/* Spacer to keep text centered */}
          </div>
          <div className="text-base text-white/70 mb-1">({word.partOfSpeech})</div>
          {word.phonetic && (
            <div className="text-base text-white/60 font-mono mb-6">/{word.phonetic}/</div>
          )}
          <div className="text-4xl text-gradient mb-6">{word.japanese}</div>
        </div>

        {word.examples.length > 0 && (
          <div className="glass-light rounded-2xl p-6 mb-8 max-w-2xl mx-auto">
            <div className="text-lg font-medium mb-2 text-white">{word.examples[0].english}</div>
            <div className="text-white/70">{word.examples[0].japanese}</div>
          </div>
        )}
        <div className="flex justify-center gap-6">
          <button
            onClick={() => handleAnswer(false)}
            className="glass-button px-8 py-4 rounded-xl text-white font-medium hover:scale-101 transition-all duration-300"
          >
            わからなかった
          </button>
          <button
            onClick={() => handleAnswer(true)}
            className="glass-button px-8 py-4 rounded-xl text-white font-medium hover:scale-101 transition-all duration-300"
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
            
            <div className="mt-10 flex justify-center">
              <button
                onClick={handleShowAnswer}
                className="glass-button px-8 py-4 rounded-xl text-white font-bold text-lg hover:scale-101 transition-all duration-300"
              >
                {mode === 'audio_recognition' || mode === 'context_fill' ? '答えを確認' : '答えを見る'}
              </button>
            </div>
          </>
        )}

        {phase === 'answer' && renderAnswer()}

      </div>
    </div>
  );
}
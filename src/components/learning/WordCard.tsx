'use client';

import { useState, useEffect } from 'react';
import { Volume2, X, Check, ArrowRight } from 'lucide-react';
import { getMasteryDisplayInfo, type MasteryStatus } from '@/lib/mastery';

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

  const renderMasteryBadge = () => {
    if (!word.progress?.status) return null;
    
    const masteryInfo = getMasteryDisplayInfo(word.progress.status as MasteryStatus);
    
    return (
      <div className="absolute top-4 right-4">
        <div className={`px-3 py-1 rounded-full text-xs font-medium text-white ${masteryInfo.color.replace('bg-', 'bg-')}`}>
          {masteryInfo.label}
        </div>
      </div>
    );
  };

  const renderQuestion = () => {
    switch (mode) {
      case 'eng_to_jpn':
        return (
          <div className="text-center">
            <div className="flex items-center justify-center gap-4 mb-3">
              <button
                onClick={playAudio}
                className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 transition-all duration-300 hover:scale-110"
              >
                <Volume2 size={24} />
              </button>
              <div className="text-5xl font-bold text-white/70">{word.english}</div>
              <div className="w-10"></div> {/* Spacer to keep text centered */}
            </div>
            <div className="text-lg text-white/70">({word.partOfSpeech})</div>
          </div>
        );
      
      case 'jpn_to_eng':
        return (
          <div className="text-center">
            <div className="text-5xl font-bold mb-3 text-white/70">{word.japanese}</div>
            <div className="text-lg text-white/70">({word.partOfSpeech})</div>
          </div>
        );
      
      case 'audio_recognition':
        return (
          <div className="text-center">
            <div className="text-xl text-white/80 mb-8">音声を聞いてください</div>
            <div className="flex items-center justify-center gap-6 max-w-lg mx-auto">
              <button
                onClick={playAudio}
                className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 transition-all duration-300 hover:scale-110"
              >
                <Volume2 size={24} />
              </button>
              <input
                type="text"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                placeholder="英単語を入力..."
                className="flex-1 bg-transparent border-0 border-b-2 border-white/30 focus:border-white/70 outline-none px-2 py-3 text-white text-lg font-medium text-center placeholder-white/50 transition-colors duration-300"
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
            <div className="mb-10">
              <div className="text-xl font-medium mb-3 text-white/80">{blankedExample}</div>
              <div className="text-lg text-white/70">{example.japanese}</div>
            </div>
            <input
              type="text"
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              placeholder="単語を入力..."
              className="bg-transparent border-0 border-b-2 border-white/30 focus:border-white/70 outline-none px-2 py-3 text-white text-lg font-medium text-center placeholder-white/50 transition-colors duration-300 max-w-md w-full"
              onKeyDown={(e) => e.key === 'Enter' && handleShowAnswer()}
            />
          </div>
        );
    }
  };

  const renderAnswer = () => {
    return (
      <div className="text-center">
        <div className="mb-4">
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={playAudio}
              className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 transition-all duration-300 hover:scale-110"
            >
              <Volume2 size={24} />
            </button>
            <div className="text-5xl font-bold text-white/70 mb-1">{word.english}</div>
            <div className="w-10"></div> {/* Spacer to keep text centered */}
          </div>
          <div className="text-base text-white/60 mb-1">( {word.partOfSpeech} )</div>
          {word.phonetic && (
            <div className="text-base text-white/60 font-mono mb-10">/{word.phonetic}/</div>
          )}
          <div className="text-4xl text-white/70 font-bold">{word.japanese}</div>
        </div>

        {word.examples.length > 0 && (
          <div className="mb-8 max-w-2xl mx-auto mb-15">
            <div className="text-lg font-medium mb-2 text-white/60">{word.examples[0].english}</div>
            <div className="text-white/60">{word.examples[0].japanese}</div>
          </div>
        )}
        <div className="flex justify-center gap-6">
          <button
            onClick={() => handleAnswer(false)}
            className="w-12 h-12 rounded-full bg-white/10 hover:bg-red-500/50 flex items-center justify-center text-white/80 hover:text-white transition-all duration-300 hover:scale-110 active:scale-95 active:bg-red-500/70"
          >
            <X size={24} />
          </button>
          <button
            onClick={() => handleAnswer(true)}
            className="w-12 h-12 rounded-full bg-white/10 hover:bg-green-500/50 flex items-center justify-center text-white/80 hover:text-white transition-all duration-300 hover:scale-110 active:scale-95 active:bg-green-500/70"
          >
            <Check size={24} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="p-10 relative">
        {renderMasteryBadge()}
        {phase === 'question' && (
          <>
            {renderQuestion()}
            
            <div className="mt-10 flex justify-center">
              <button
                onClick={handleShowAnswer}
                className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 transition-all duration-300 hover:scale-110"
              >
                <ArrowRight size={24} />
              </button>
            </div>
          </>
        )}

        {phase === 'answer' && renderAnswer()}

      </div>
    </div>
  );
}
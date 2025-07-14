'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock } from 'lucide-react';

interface CountdownTimerProps {
  endDate: Date;
}

export default function CountdownTimer({ endDate }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = endDate.getTime() - now;

      if (distance > 0) {
        setTimeLeft({
          days: Math.floor(distance / (1000 * 60 * 60 * 24)),
          hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distance % (1000 * 60)) / 1000)
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [endDate]);

  const isExpired = timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0;

  return (
    <Card className="bg-gradient-to-r from-red-500 to-pink-500 text-white">
      <CardHeader className="text-center pb-3">
        <CardTitle className="flex items-center justify-center gap-2 text-white">
          <Clock className="h-5 w-5" />
          {isExpired ? 'Group Buy Ended' : 'Time Remaining'}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {isExpired ? (
          <div className="text-center">
            <p className="text-lg font-semibold">This group buy has ended</p>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="bg-white/20 rounded-lg p-3">
              <div className="text-2xl font-bold">{timeLeft.days}</div>
              <div className="text-xs opacity-90">Days</div>
            </div>
            <div className="bg-white/20 rounded-lg p-3">
              <div className="text-2xl font-bold">{timeLeft.hours}</div>
              <div className="text-xs opacity-90">Hours</div>
            </div>
            <div className="bg-white/20 rounded-lg p-3">
              <div className="text-2xl font-bold">{timeLeft.minutes}</div>
              <div className="text-xs opacity-90">Min</div>
            </div>
            <div className="bg-white/20 rounded-lg p-3">
              <div className="text-2xl font-bold">{timeLeft.seconds}</div>
              <div className="text-xs opacity-90">Sec</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
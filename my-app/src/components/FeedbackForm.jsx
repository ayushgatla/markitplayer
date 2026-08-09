import React, { useState } from 'react';
import { Star, CheckCircle2 } from 'lucide-react';

export function FeedbackForm() {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [willingToPay, setWillingToPay] = useState('');
  const [freeTrial, setFreeTrial] = useState('');
  
  const [contact, setContact] = useState('');
  const [feedback, setFeedback] = useState('');
  
  const [status, setStatus] = useState('idle'); // 'idle' | 'submitting' | 'success' | 'error'

  const handleSubmit = async () => {
    setStatus('submitting');
    
    try {
      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({
          access_key: 'b6b6173b-e93f-4acd-8431-5fc318641d26',
          subject: 'New Feedback Submission from Blasync',
          from_name: 'Blasync Feedback Form',
          Rating: rating || 'Not rated',
          'Willing To Pay': willingToPay || 'Not answered',
          'Free Trial': freeTrial || 'Not answered',
          Contact: contact || 'Not provided',
          Feedback: feedback || 'No additional feedback',
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setStatus('success');
        // Reset form
        setRating(0);
        setWillingToPay('');
        setFreeTrial('');
        setContact('');
        setFeedback('');
        
        // Return to idle after a few seconds
        setTimeout(() => setStatus('idle'), 4000);
      } else {
        setStatus('error');
        setTimeout(() => setStatus('idle'), 4000);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 4000);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto bg-zinc-900/50 border border-white/5 text-white rounded-3xl p-6 md:p-8 text-left shadow-2xl mb-24 relative overflow-hidden">
      
      {/* Success Overlay */}
      {status === 'success' && (
        <div className="absolute inset-0 z-50 bg-zinc-950/90 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-300">
          <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-bold mb-4">Thank you for your feedback!</h2>
          <p className="text-zinc-400 text-lg">Your response has been sent and will help us improve Blasync.</p>
        </div>
      )}

      <div className="grid md:grid-cols-[1fr_360px] gap-8 md:gap-12 relative z-10">
        {/* Left Side: Questions */}
        <div className="flex flex-col gap-8">
          <div>
            <h3 className="text-[1.1rem] font-bold mb-3 tracking-wide text-zinc-100">1. Overall, how useful does this app feel for freelance video editors?</h3>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  onClick={() => setRating(star)}
                  className="focus:outline-none transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-9 h-9 ${star <= (hoveredRating || rating) ? 'fill-white text-white' : 'text-zinc-600'}`}
                    strokeWidth={star <= (hoveredRating || rating) ? 2 : 1.5}
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-[1.1rem] font-bold mb-4 tracking-wide text-zinc-100">2. Would you consider paying for an app like this?</h3>
            <div className="flex flex-col gap-3">
              {['Yes Definitely', 'Maybe, if pricing is reasonable', 'No'].map((option) => (
                <label key={option} className="flex items-center gap-4 cursor-pointer group">
                  <div className={`w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center transition-colors ${willingToPay === option ? 'border-white' : 'border-zinc-600 group-hover:border-zinc-400'}`}>
                    {willingToPay === option && <div className="w-[10px] h-[10px] bg-white rounded-full" />}
                  </div>
                  <span className="text-zinc-300 text-[1.05rem]">{option}</span>
                  <input type="radio" className="hidden" checked={willingToPay === option} onChange={() => setWillingToPay(option)} />
                </label>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-[1.1rem] font-bold mb-4 tracking-wide text-zinc-100">3. Would you like to try a free trial of this app for a short time?</h3>
            <div className="flex flex-col gap-3">
              {['Yes', 'Maybe, Later', 'No'].map((option) => (
                <label key={option} className="flex items-center gap-4 cursor-pointer group">
                  <div className={`w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center transition-colors ${freeTrial === option ? 'border-white' : 'border-zinc-600 group-hover:border-zinc-400'}`}>
                    {freeTrial === option && <div className="w-[10px] h-[10px] bg-white rounded-full" />}
                  </div>
                  <span className="text-zinc-300 text-[1.05rem]">{option}</span>
                  <input type="radio" className="hidden" checked={freeTrial === option} onChange={() => setFreeTrial(option)} />
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Inputs */}
        <div className="bg-zinc-950 border border-white/5 rounded-2xl p-6 flex flex-col h-full shadow-inner">
          <div className="mb-6">
            <h3 className="text-[1.1rem] font-bold mb-3 tracking-wide text-zinc-100">Your Contact Details<br/><span className="text-[0.95rem] font-normal text-zinc-500">(Optional)</span></h3>
            <input
              type="text"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="Email or Phone number"
              className="w-full bg-zinc-900 border border-white/10 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-white/20 placeholder-zinc-500 transition-shadow"
            />
          </div>
          
          <div className="flex-1 flex flex-col">
            <h3 className="text-[1.1rem] font-bold mb-3 tracking-wide text-zinc-100">Feedback (Optional)</h3>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Your valuable Feedback"
              className="w-full flex-1 min-h-[140px] bg-zinc-900 border border-white/10 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-white/20 resize-none placeholder-zinc-500 transition-shadow"
            ></textarea>
          </div>

          <button 
            onClick={handleSubmit}
            disabled={status === 'submitting'}
            className="mt-8 w-full py-4 bg-white hover:bg-zinc-200 text-black font-bold rounded-full transition-colors shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {status === 'submitting' ? 'Sending...' : status === 'error' ? 'Error. Try Again' : 'Share Feedback →'}
          </button>
        </div>
      </div>
    </div>
  );
}

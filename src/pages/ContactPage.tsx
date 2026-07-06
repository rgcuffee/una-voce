import { type FormEvent, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { ViewNavigator } from '../navigation';

export function ContactPage({ onNavigate }: { onNavigate: ViewNavigator }) {
  const [searchParams] = useSearchParams();
  const [submitState, setSubmitState] = useState<
    'idle' | 'submitting' | 'success' | 'error'
  >(searchParams.get('success') === 'true' ? 'success' : 'idle');
  const isSuccess = submitState === 'success';
  const isSubmitting = submitState === 'submitting';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setSubmitState('submitting');

    try {
      const formData = new FormData(form);
      const encodedData = new URLSearchParams();

      for (const [key, value] of formData.entries()) {
        if (typeof value === 'string') {
          encodedData.append(key, value);
        }
      }

      const response = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: encodedData.toString(),
      });

      if (!response.ok) {
        throw new Error(`Contact form returned ${response.status}`);
      }

      form.reset();
      setSubmitState('success');
    } catch (error) {
      console.error('Unable to submit contact form.', error);
      setSubmitState('error');
    }
  }

  return (
    <article className='page'>
      <button
        type='button'
        className='page-back'
        onClick={() => onNavigate('more')}
      >
        ‹ More
      </button>

      <header className='page-hero'>
        <div className='page-eyebrow'>Contact</div>
        <h1 className='page-hero-title'>Tell us what would help you pray</h1>
        <p className='page-lead'>
          Send a note about partnerships, content, community listings, or
          anything that would make Una Voce more useful to the faithful.
        </p>
      </header>

      {isSuccess ? (
        <section className='contact-success'>
          <div className='contact-success-mark'>✓</div>
          <div>
            <h2 className='page-section-title'>Your message has been sent</h2>
            <p>
              Thank you for reaching out. We will read your note carefully and
              reply when a response is needed.
            </p>
          </div>
        </section>
      ) : (
      <div className='contact-layout'>
        <form
          name='contact'
          method='POST'
          action='/contact-success/'
          encType='application/x-www-form-urlencoded'
          data-netlify='true'
          netlify-honeypot='bot-field'
          data-netlify-honeypot='bot-field'
          className='contact-form'
          onSubmit={handleSubmit}
        >
          <input type='hidden' name='form-name' value='contact' />
          <p className='contact-hidden-field' hidden>
            <label>
              Do not fill this out: <input name='bot-field' />
            </label>
          </p>

          <label className='contact-field'>
            <span>Name</span>
            <input name='name' type='text' autoComplete='name' required />
          </label>

          <label className='contact-field'>
            <span>Email</span>
            <input name='email' type='email' autoComplete='email' required />
          </label>

          <label className='contact-field'>
            <span>Reason</span>
            <select name='reason' defaultValue='general' required>
              <option value='general'>General note</option>
              <option value='partner'>Partner or community listing</option>
              <option value='content'>Content suggestion</option>
              <option value='support'>Prayer support or access issue</option>
            </select>
          </label>

          <label className='contact-field'>
            <span>Message</span>
            <textarea name='message' rows={7} required />
          </label>

          {submitState === 'error' ? (
            <p className='contact-error' role='alert'>
              The message could not be sent. Please try again in a moment.
            </p>
          ) : null}

          <button
            type='submit'
            className='page-cta-button contact-submit'
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Sending...' : 'Send message'}
          </button>
        </form>

        <aside className='contact-note' aria-label='Contact guidance'>
          <div className='contact-note-eyebrow'>A good note includes</div>
          <ul className='feature-list compact'>
            <li>Who you are and how we can reply</li>
            <li>The community, creator, or resource you have in mind</li>
            <li>Any relevant links, dates, or liturgical context</li>
          </ul>
          <p>
            For partner submissions, include the public channel, website, or
            livestream source so we can review it with care.
          </p>
        </aside>
      </div>
      )}
    </article>
  );
}

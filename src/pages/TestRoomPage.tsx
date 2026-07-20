import { useEffect, useRef, useState } from 'react';

type RoomStatus = 'live' | 'scheduled';

type Room = {
  id: string;
  name: string;
  description: string;
  status: RoomStatus;
  scheduledFor: string | null;
  requiresZoomAuth: boolean;
  isConfigured: boolean;
};

type ZoomProfile = {
  id: string;
  name: string;
  email: string;
};

type ZoomSession = {
  connected: boolean;
  profile: ZoomProfile | null;
};

const FALLBACK_ROOM: Room = {
  id: 'test-room',
  name: 'Compline together',
  description: 'A quiet, hosted room for praying Night Prayer together.',
  status: 'scheduled',
  scheduledFor: null,
  requiresZoomAuth: false,
  isConfigured: false,
};

export function TestRoomPage() {
  const [room, setRoom] = useState<Room>(FALLBACK_ROOM);
  const [roomLoaded, setRoomLoaded] = useState(false);
  const [session, setSession] = useState<ZoomSession>({ connected: false, profile: null });
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [selected, setSelected] = useState(false);
  const [name, setName] = useState('');
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const meetingRootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void loadRoom();
    void loadSession();
  }, []);

  useEffect(() => {
    if (session.profile?.name) setName((current) => current || session.profile?.name || '');
  }, [session.profile]);

  useEffect(() => {
    const zoomResult = new URLSearchParams(window.location.search).get('zoom');
    if (!zoomResult) return;

    const messages: Record<string, string> = {
      connected: 'Your Zoom account is connected.',
      denied: 'Zoom sign-in was cancelled or could not be verified.',
      failed: 'Zoom sign-in did not complete. Please try again.',
      'not-configured': 'Zoom OAuth is not configured on this environment yet.',
    };
    if (messages[zoomResult]) setMessage(messages[zoomResult]);
    window.history.replaceState({}, '', '/test-room');
  }, []);

  async function loadRoom() {
    try {
      const response = await fetch('/api/zoom/test-room');
      if (!response.ok) throw new Error();
      const data = (await response.json()) as { room: Room };
      setRoom(data.room);
    } catch {
      setMessage('The room details could not be refreshed. Showing the experimental default.');
    } finally {
      setRoomLoaded(true);
    }
  }

  async function loadSession() {
    try {
      const response = await fetch('/api/zoom/session');
      if (!response.ok) throw new Error();
      setSession((await response.json()) as ZoomSession);
    } catch {
      // The page remains usable for guest rooms if the identity check is unavailable.
    } finally {
      setSessionLoaded(true);
    }
  }

  async function signOut() {
    await fetch('/api/zoom/session', { method: 'POST' });
    setSession({ connected: false, profile: null });
    setMessage('Your Zoom account has been disconnected from this browser.');
  }

  async function joinRoom() {
    if (!name.trim()) {
      setMessage('Add the name you would like to use in the room.');
      return;
    }
    if (!room.isConfigured) {
      setMessage('This room is ready in the interface, but it still needs Zoom credentials and a meeting number in the server environment.');
      return;
    }
    if (!meetingRootRef.current) return;

    setJoining(true);
    setMessage(null);
    try {
      const authorization = await fetch('/api/zoom/meeting-signature', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ roomId: room.id, userName: name.trim() }),
      });
      const credentials = await authorization.json() as {
        error?: string;
        signature?: string;
        meetingNumber?: string;
        password?: string;
        zak?: string;
      };
      if (!authorization.ok || !credentials.signature || !credentials.meetingNumber) {
        throw new Error(credentials.error ?? 'Zoom could not authorize this join.');
      }

      const { default: ZoomMtgEmbedded } = await import('@zoom/meetingsdk/embedded');
      const client = ZoomMtgEmbedded.createClient();
      const initialized = await client.init({
        zoomAppRoot: meetingRootRef.current,
        language: 'en-US',
        patchJsMedia: true,
      });
      if (typeof initialized !== 'string') throw new Error(initialized.reason);

      const joinedMeeting = await client.join({
        signature: credentials.signature,
        meetingNumber: credentials.meetingNumber,
        password: credentials.password,
        userName: name.trim(),
        userEmail: session.profile?.email || undefined,
        zak: credentials.zak,
      });
      if (typeof joinedMeeting !== 'string') throw new Error(joinedMeeting.reason);
      setJoined(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to join the Zoom room.');
    } finally {
      setJoining(false);
    }
  }

  const statusText = room.status === 'live'
    ? 'Live now'
    : room.scheduledFor
      ? `Scheduled ${formatDate(room.scheduledFor)}`
      : 'Scheduled — time to be announced';

  return (
    <main className='test-room-page'>
      <header className='test-room-header'>
        <a className='test-room-wordmark' href='/' aria-label='Una Voce home'>
          una <span>voce</span>
        </a>
        <span className='test-room-experiment'>Experimental room</span>
      </header>

      <section className='test-room-intro' aria-labelledby='test-room-title'>
        <p className='test-room-kicker'>Pray together</p>
        <h1 id='test-room-title'>A room for the common prayer of the Church.</h1>
        <p>Choose the room below. Connect your Zoom account if you would like to join with it, or enter as a guest when the room allows it.</p>
      </section>

      <section className='test-room-layout' aria-label='Experimental Zoom room'>
        <article className={`test-room-card ${selected ? 'is-selected' : ''}`}>
          <div className='test-room-card-topline'>
            <span className={`test-room-status ${room.status === 'live' ? 'is-live' : ''}`}>
              <span className='test-room-status-dot' />
              {statusText}
            </span>
            <span className='test-room-provider'>Zoom</span>
          </div>
          <div className='test-room-card-copy'>
            <h2>{room.name}</h2>
            <p>{room.description}</p>
          </div>
          <button
            type='button'
            className='test-room-select-button'
            onClick={() => setSelected(true)}
            disabled={!roomLoaded}
          >
            {selected ? 'Room selected' : 'Enter room'}
          </button>
        </article>

        {selected && (
          <aside className='test-room-entry' aria-labelledby='room-entry-title'>
            <div className='test-room-entry-heading'>
              <div>
                <p className='test-room-kicker'>Before you join</p>
                <h2 id='room-entry-title'>Enter with intention.</h2>
              </div>
              {sessionLoaded && session.connected ? (
                <button className='test-room-text-button' type='button' onClick={() => void signOut()}>Sign out</button>
              ) : (
                <button className='test-room-zoom-button' type='button' onClick={() => { window.location.assign('/api/zoom/oauth/start'); }}>
                  <span aria-hidden='true'>↗</span> Continue with Zoom
                </button>
              )}
            </div>

            {session.connected && session.profile && (
              <p className='test-room-connected'>Connected as <strong>{session.profile.name}</strong>{session.profile.email ? ` (${session.profile.email})` : ''}.</p>
            )}
            {!session.connected && !room.requiresZoomAuth && (
              <p className='test-room-guest-note'>A Zoom account is optional for this room. Connecting one makes the identity relationship explicit.</p>
            )}
            {room.requiresZoomAuth && !session.connected && (
              <p className='test-room-required-note'>This room is configured to require a signed-in Zoom account.</p>
            )}

            <label className='test-room-name-field'>
              <span>Your name in the room</span>
              <input value={name} onChange={(event) => setName(event.target.value)} maxLength={64} autoComplete='name' placeholder='Your name' />
            </label>
            <button className='test-room-join-button' type='button' onClick={() => void joinRoom()} disabled={joining || !roomLoaded}>
              {joining ? 'Joining Zoom…' : 'Join the room'}
            </button>
            <p className='test-room-privacy'>Your camera and microphone settings are chosen inside Zoom. This experimental page does not store them.</p>
          </aside>
        )}
      </section>

      {message && <p className='test-room-message' role='status'>{message}</p>}
      <div className={`test-room-embed ${joined ? 'is-active' : ''}`} ref={meetingRootRef} aria-label='Zoom meeting' />
    </main>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

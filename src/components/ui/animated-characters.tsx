import { useState, useEffect, useRef } from 'react';

interface PupilProps {
  size?: number;
  maxDistance?: number;
  pupilColor?: string;
  forceLookX?: number;
  forceLookY?: number;
}

export const Pupil = ({
  size = 12,
  maxDistance = 5,
  pupilColor = 'black',
  forceLookX,
  forceLookY,
}: PupilProps) => {
  const [mouseX, setMouseX] = useState(0);
  const [mouseY, setMouseY] = useState(0);
  const pupilRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMouseX(e.clientX);
      setMouseY(e.clientY);
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  const calculatePupilPosition = () => {
    if (!pupilRef.current) return { x: 0, y: 0 };

    if (forceLookX !== undefined && forceLookY !== undefined) {
      return { x: forceLookX, y: forceLookY };
    }

    const pupil = pupilRef.current.getBoundingClientRect();
    const pupilCenterX = pupil.left + pupil.width / 2;
    const pupilCenterY = pupil.top + pupil.height / 2;

    const deltaX = mouseX - pupilCenterX;
    const deltaY = mouseY - pupilCenterY;
    const distance = Math.min(Math.sqrt(deltaX ** 2 + deltaY ** 2), maxDistance);

    const angle = Math.atan2(deltaY, deltaX);
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance;

    return { x, y };
  };

  const pupilPosition = calculatePupilPosition();

  return (
    <div
      ref={pupilRef}
      style={{
        width: size,
        height: size,
        borderRadius: '9999px',
        transition: 'transform 100ms ease-out',
        backgroundColor: pupilColor,
        transform: `translate(${pupilPosition.x}px, ${pupilPosition.y}px)`,
      }}
    />
  );
};

interface EyeBallProps {
  size?: number;
  pupilSize?: number;
  maxDistance?: number;
  eyeColor?: string;
  pupilColor?: string;
  isBlinking?: boolean;
  forceLookX?: number;
  forceLookY?: number;
}

export const EyeBall = ({
  size = 48,
  pupilSize = 16,
  maxDistance = 10,
  eyeColor = 'white',
  pupilColor = 'black',
  isBlinking = false,
  forceLookX,
  forceLookY,
}: EyeBallProps) => {
  const [mouseX, setMouseX] = useState(0);
  const [mouseY, setMouseY] = useState(0);
  const eyeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMouseX(e.clientX);
      setMouseY(e.clientY);
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  const calculatePupilPosition = () => {
    if (!eyeRef.current) return { x: 0, y: 0 };

    if (forceLookX !== undefined && forceLookY !== undefined) {
      return { x: forceLookX, y: forceLookY };
    }

    const eye = eyeRef.current.getBoundingClientRect();
    const eyeCenterX = eye.left + eye.width / 2;
    const eyeCenterY = eye.top + eye.height / 2;

    const deltaX = mouseX - eyeCenterX;
    const deltaY = mouseY - eyeCenterY;
    const distance = Math.min(Math.sqrt(deltaX ** 2 + deltaY ** 2), maxDistance);

    const angle = Math.atan2(deltaY, deltaX);
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance;

    return { x, y };
  };

  const pupilPosition = calculatePupilPosition();

  return (
    <div
      ref={eyeRef}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        borderRadius: '9999px',
        border: '2px solid black',
        transition: 'transform 150ms ease-out',
        width: size,
        height: size,
        backgroundColor: eyeColor,
        transform: isBlinking ? 'scaleY(0.1)' : 'scaleY(1)',
      }}
    >
      {!isBlinking && (
        <div
          style={{
            borderRadius: '9999px',
            transition: 'transform 100ms ease-out',
            width: pupilSize,
            height: pupilSize,
            backgroundColor: pupilColor,
            transform: `translate(${pupilPosition.x}px, ${pupilPosition.y}px)`,
          }}
        />
      )}
    </div>
  );
};

interface AnimatedCharactersProps {
  isTyping?: boolean;
  showPassword?: boolean;
  passwordLength?: number;
}

export function AnimatedCharacters({
  isTyping = false,
  showPassword = false,
  passwordLength = 0,
}: AnimatedCharactersProps) {
  const [mouseX, setMouseX] = useState(0);
  const [mouseY, setMouseY] = useState(0);
  const [isPurpleBlinking, setIsPurpleBlinking] = useState(false);
  const [isBlackBlinking, setIsBlackBlinking] = useState(false);
  const [isLookingAtEachOther, setIsLookingAtEachOther] = useState(false);
  const [isPurplePeeking, setIsPurplePeeking] = useState(false);
  const purpleRef = useRef<HTMLDivElement>(null);
  const blackRef = useRef<HTMLDivElement>(null);
  const yellowRef = useRef<HTMLDivElement>(null);
  const orangeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMouseX(e.clientX);
      setMouseY(e.clientY);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    const getRandomBlinkInterval = () => Math.random() * 4000 + 3000;

    const scheduleBlink = () => {
      const blinkTimeout = setTimeout(() => {
        setIsPurpleBlinking(true);
        setTimeout(() => {
          setIsPurpleBlinking(false);
          scheduleBlink();
        }, 150);
      }, getRandomBlinkInterval());

      return blinkTimeout;
    };

    const timeout = scheduleBlink();
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const getRandomBlinkInterval = () => Math.random() * 4000 + 3000;

    const scheduleBlink = () => {
      const blinkTimeout = setTimeout(() => {
        setIsBlackBlinking(true);
        setTimeout(() => {
          setIsBlackBlinking(false);
          scheduleBlink();
        }, 150);
      }, getRandomBlinkInterval());

      return blinkTimeout;
    };

    const timeout = scheduleBlink();
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (isTyping) {
      setIsLookingAtEachOther(true);
      const timer = setTimeout(() => {
        setIsLookingAtEachOther(false);
      }, 800);
      return () => clearTimeout(timer);
    } else {
      setIsLookingAtEachOther(false);
    }
  }, [isTyping]);

  useEffect(() => {
    if (passwordLength > 0 && showPassword) {
      const schedulePeek = () => {
        const peekInterval = setTimeout(() => {
          setIsPurplePeeking(true);
          setTimeout(() => {
            setIsPurplePeeking(false);
          }, 800);
        }, Math.random() * 3000 + 2000);
        return peekInterval;
      };

      const firstPeek = schedulePeek();
      return () => clearTimeout(firstPeek);
    } else {
      setIsPurplePeeking(false);
    }
   
  }, [passwordLength, showPassword]);

  const calculatePosition = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (!ref.current) return { faceX: 0, faceY: 0, bodySkew: 0 };

    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 3;

    const deltaX = mouseX - centerX;
    const deltaY = mouseY - centerY;

    const faceX = Math.max(-15, Math.min(15, deltaX / 20));
    const faceY = Math.max(-10, Math.min(10, deltaY / 30));
    const bodySkew = Math.max(-6, Math.min(6, -deltaX / 120));

    return { faceX, faceY, bodySkew };
  };

  const purplePos = calculatePosition(purpleRef);
  const blackPos = calculatePosition(blackRef);
  const yellowPos = calculatePosition(yellowRef);
  const orangePos = calculatePosition(orangeRef);

  const isHidingPassword = passwordLength > 0 && !showPassword;

  // S = 1.75× scale factor applied to all character dimensions and positions
  const S = 1.75;

  return (
    <div style={{ position: 'relative', width: `${Math.round(400 * S)}px`, height: `${Math.round(300 * S)}px` }}>
      {/* Purple tall rectangle — back layer */}
      <div
        ref={purpleRef}
        style={{
          position: 'absolute', zIndex: 10, borderRadius: '24px', border: '4px solid black', background: '#B19CD9', transition: 'all 500ms ease-out',
          width: Math.round(112 * S),
          height: Math.round(192 * S),
          left: '50%',
          marginLeft: Math.round(-8 * S),
          bottom: 0,
          transform:
            passwordLength > 0 && showPassword
              ? `skewX(0deg)`
              : isTyping || isHidingPassword
                ? `skewX(${(purplePos.bodySkew || 0) - 12}deg) translateX(${Math.round(40 * S)}px)`
                : `skewX(${purplePos.bodySkew || 0}deg)`,
          transformOrigin: 'bottom center',
        }}
      >
        <div
          style={{
            position: 'absolute',
            display: 'flex',
            gap: Math.round(12),
            transition: 'all 500ms ease-out',
            left: passwordLength > 0 && showPassword
              ? Math.round(20 * S)
              : isLookingAtEachOther
                ? Math.round(55 * S)
                : Math.round(45 * S) + purplePos.faceX,
            top: passwordLength > 0 && showPassword
              ? Math.round(35 * S)
              : isLookingAtEachOther
                ? Math.round(65 * S)
                : Math.round(40 * S) + purplePos.faceY,
          }}
        >
          <EyeBall
            size={Math.round(24 * S)}
            pupilSize={Math.round(8 * S)}
            maxDistance={Math.round(5 * S)}
            isBlinking={isPurpleBlinking}
            forceLookX={passwordLength > 0 && showPassword ? (isPurplePeeking ? 4 : -4) : isLookingAtEachOther ? 3 : undefined}
            forceLookY={passwordLength > 0 && showPassword ? (isPurplePeeking ? 5 : -4) : isLookingAtEachOther ? 4 : undefined}
          />
          <EyeBall
            size={Math.round(24 * S)}
            pupilSize={Math.round(8 * S)}
            maxDistance={Math.round(5 * S)}
            isBlinking={isPurpleBlinking}
            forceLookX={passwordLength > 0 && showPassword ? (isPurplePeeking ? 4 : -4) : isLookingAtEachOther ? 3 : undefined}
            forceLookY={passwordLength > 0 && showPassword ? (isPurplePeeking ? 5 : -4) : isLookingAtEachOther ? 4 : undefined}
          />
        </div>
      </div>

      {/* Black tall rectangle — middle layer */}
      <div
        ref={blackRef}
        style={{ position: 'absolute', zIndex: 20, borderRadius: '24px', border: '4px solid black', background: '#000', transition: 'all 500ms ease-out',
          width: Math.round(96 * S),
          height: Math.round(160 * S),
          left: '50%',
          marginLeft: Math.round(-92 * S),
          bottom: 0,
          transform:
            passwordLength > 0 && showPassword
              ? `skewX(0deg)`
              : isLookingAtEachOther
                ? `skewX(${(blackPos.bodySkew || 0) * 1.5 + 10}deg) translateX(${Math.round(20 * S)}px)`
                : isTyping || isHidingPassword
                  ? `skewX(${(blackPos.bodySkew || 0) * 1.5}deg)`
                  : `skewX(${blackPos.bodySkew || 0}deg)`,
          transformOrigin: 'bottom center',
        }}
      >
        <div
          style={{
            position: 'absolute',
            display: 'flex',
            gap: 4,
            transition: 'all 500ms ease-out',
            left: passwordLength > 0 && showPassword
              ? Math.round(10 * S)
              : isLookingAtEachOther
                ? Math.round(32 * S)
                : Math.round(26 * S) + blackPos.faceX,
            top: passwordLength > 0 && showPassword
              ? Math.round(28 * S)
              : isLookingAtEachOther
                ? Math.round(12 * S)
                : Math.round(32 * S) + blackPos.faceY,
          }}
        >
          <EyeBall
            size={Math.round(20 * S)}
            pupilSize={Math.round(6 * S)}
            maxDistance={Math.round(4 * S)}
            isBlinking={isBlackBlinking}
            forceLookX={passwordLength > 0 && showPassword ? -4 : isLookingAtEachOther ? 0 : undefined}
            forceLookY={passwordLength > 0 && showPassword ? -4 : isLookingAtEachOther ? -4 : undefined}
          />
          <EyeBall
            size={Math.round(20 * S)}
            pupilSize={Math.round(6 * S)}
            maxDistance={Math.round(4 * S)}
            isBlinking={isBlackBlinking}
            forceLookX={passwordLength > 0 && showPassword ? -4 : isLookingAtEachOther ? 0 : undefined}
            forceLookY={passwordLength > 0 && showPassword ? -4 : isLookingAtEachOther ? -4 : undefined}
          />
        </div>
      </div>

      {/* Orange semi-circle — front left */}
      <div
        ref={orangeRef}
        style={{ position: 'absolute', zIndex: 30, borderRadius: '9999px 9999px 0 0', border: '4px solid black', background: '#FFB347', transition: 'all 500ms ease-out',
          width: Math.round(128 * S),
          height: Math.round(96 * S),
          left: '50%',
          marginLeft: Math.round(-142 * S),
          bottom: 0,
          transform: passwordLength > 0 && showPassword ? `skewX(0deg)` : `skewX(${orangePos.bodySkew || 0}deg)`,
          transformOrigin: 'bottom center',
        }}
      >
        <div
          style={{
            position: 'absolute',
            display: 'flex',
            transition: 'all 500ms ease-out',
            gap: Math.round(32 * S),
            left: passwordLength > 0 && showPassword
              ? Math.round(50 * S)
              : Math.round(82 * S) + (orangePos.faceX || 0),
            top: passwordLength > 0 && showPassword
              ? Math.round(85 * S)
              : Math.round(90 * S) + (orangePos.faceY || 0),
          }}
        >
          <Pupil
            size={Math.round(10 * S)}
            maxDistance={Math.round(3 * S)}
            forceLookX={passwordLength > 0 && showPassword ? -5 : undefined}
            forceLookY={passwordLength > 0 && showPassword ? -4 : undefined}
          />
          <Pupil
            size={Math.round(10 * S)}
            maxDistance={Math.round(3 * S)}
            forceLookX={passwordLength > 0 && showPassword ? -5 : undefined}
            forceLookY={passwordLength > 0 && showPassword ? -4 : undefined}
          />
        </div>
      </div>

      {/* Yellow tall rectangle — front right */}
      <div
        ref={yellowRef}
        style={{ position: 'absolute', zIndex: 30, borderRadius: '24px', border: '4px solid black', background: '#FFDF00', transition: 'all 500ms ease-out',
          width: Math.round(96 * S),
          height: Math.round(128 * S),
          left: '50%',
          marginLeft: Math.round(24 * S),
          bottom: 0,
          transform: passwordLength > 0 && showPassword ? `skewX(0deg)` : `skewX(${yellowPos.bodySkew || 0}deg)`,
          transformOrigin: 'bottom center',
        }}
      >
        <div
          style={{
            position: 'absolute',
            display: 'flex',
            transition: 'all 500ms ease-out',
            gap: Math.round(12 * S),
            left: passwordLength > 0 && showPassword
              ? Math.round(20 * S)
              : Math.round(52 * S) + (yellowPos.faceX || 0),
            top: passwordLength > 0 && showPassword
              ? Math.round(35 * S)
              : Math.round(40 * S) + (yellowPos.faceY || 0),
          }}
        >
          <Pupil
            size={Math.round(12 * S)}
            maxDistance={Math.round(4 * S)}
            forceLookX={passwordLength > 0 && showPassword ? -5 : undefined}
            forceLookY={passwordLength > 0 && showPassword ? -4 : undefined}
          />
          <Pupil
            size={Math.round(12 * S)}
            maxDistance={Math.round(4 * S)}
            forceLookX={passwordLength > 0 && showPassword ? -5 : undefined}
            forceLookY={passwordLength > 0 && showPassword ? -4 : undefined}
          />
        </div>
        <div
          style={{ position: 'absolute', borderRadius: '9999px', background: '#000', transition: 'all 500ms ease-out',
            height: Math.round(4 * S),
            width: passwordLength > 0 && showPassword ? Math.round(26 * S) : isHidingPassword ? Math.round(20 * S) : Math.round(32 * S),
            left: passwordLength > 0 && showPassword
              ? Math.round(10 * S)
              : Math.round(40 * S) + (yellowPos.faceX || 0),
            top: passwordLength > 0 && showPassword
              ? Math.round(88 * S)
              : Math.round(88 * S) + (yellowPos.faceY || 0),
          }}
        />
      </div>
    </div>
  );
}

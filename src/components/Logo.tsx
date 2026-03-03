import React from 'react'

interface LogoProps {
    className?: string;
    size?: number;
}

export const Logo: React.FC<LogoProps> = ({ className = "", size = 48 }) => {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            {/* Corner Brackets */}
            <path d="M10 25V10H25" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M75 10H90V25" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M10 75V90H25" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M75 90H90V75" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />

            {/* Eye Outer Shell */}
            <path
                d="M10 50C10 50 25 25 50 25C75 25 90 50 90 50C90 50 75 75 50 75C25 75 10 50 10 50Z"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
            />

            {/* Iris / Inner Circle */}
            <circle cx="50" cy="50" r="18" stroke="currentColor" strokeWidth="3" />

            {/* Pupil */}
            <circle cx="50" cy="50" r="10" fill="currentColor" />

            {/* Highlight */}
            <circle cx="56" cy="44" r="3" fill="white" />
        </svg>
    );
};

export const LogoText: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = "" }) => {
    return (
        <span
            className={`font-black tracking-tighter bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent ${className}`}
            style={{ fontSize: size }}
        >
            RETISCAN
        </span>
    );
};

/**
 * TharMate Layout — Hides global Navbar/Footer for full-screen V3 design
 * 
 * Uses a data attribute approach so the main layout.tsx can conditionally
 * hide its chrome (navbar, footer) when TharMate is active.
 */

import './tharmate.css';

export default function TharMateLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="tharmate-page-wrapper">
            {children}
        </div>
    );
}

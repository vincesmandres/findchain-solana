import type { Metadata } from "next";
import "@solana/wallet-adapter-react-ui/styles.css";
import "./styles.css";
export const metadata: Metadata = { title: "FindChain — Objetos encontrados", description: "Registro descentralizado de objetos encontrados sobre Solana Devnet" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="es"><body>{children}</body></html>; }

import React from 'react';
import { Link } from 'react-router-dom';

export function LoginButton() {
  return (
    <Link
      to="/login"
      className="block w-full py-3 bg-accent text-white font-medium rounded-lg text-center hover:bg-accentHover transition-colors"
    >
      Iniciar sesión
    </Link>
  );
}
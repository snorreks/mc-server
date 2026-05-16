/// <reference types="@sveltejs/kit" />

declare namespace App {
  interface Locals {
    user?: {
      uid: string;
      email: string;
      displayName: string;
      photoURL: string;
      isActive: boolean;
    };
    theme?: string;
  }
}

import React from 'react';
import { createPortal } from 'react-dom';

interface PortalProps {
  children: React.ReactNode;
  target?: HTMLElement;
}

export const Portal: React.FC<PortalProps> = ({
  children,
  target = document.body,
}) => {
  return createPortal(children, target);
};

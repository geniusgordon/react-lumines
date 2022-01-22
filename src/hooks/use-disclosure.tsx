import React from 'react';

function useDisclosure() {
  const [open, setOpen] = React.useState(false);

  const onOpen = React.useCallback(() => {
    setOpen(true);
  }, []);

  const onClose = React.useCallback(() => {
    setOpen(false);
  }, []);

  return {
    open,
    onOpen,
    onClose,
  };
}

export default useDisclosure;

import * as React from 'react';
import { cn } from '../../lib/utils';

const BubbleContext = React.createContext({ align: 'start', variant: 'default' });

function Bubble({ align = 'start', variant = 'default', className, children, ...props }) {
  return (
    <BubbleContext.Provider value={{ align, variant }}>
      <div
        data-slot="bubble"
        data-align={align}
        data-variant={variant}
        className={cn(
          'flex w-full flex-col gap-1.5',
          align === 'end' ? 'items-end' : 'items-start',
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </BubbleContext.Provider>
  );
}

function BubbleContent({ className, children, ...props }) {
  const { align, variant } = React.useContext(BubbleContext);
  const isMuted = variant === 'muted';

  return (
    <div
      data-slot="bubble-content"
      className={cn(
        'max-w-[86%] rounded-lg border px-3.5 py-3 text-sm leading-6 shadow-xs sm:max-w-[75%]',
        isMuted
          ? 'border-border bg-muted/70 text-foreground'
          : 'border-primary/30 bg-primary text-primary-foreground',
        align === 'end' ? 'rounded-br-sm' : 'rounded-bl-sm',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function BubbleGroup({ className, ...props }) {
  return <div data-slot="bubble-group" className={cn('flex flex-col gap-3', className)} {...props} />;
}

function BubbleReactions({ className, ...props }) {
  return (
    <div
      data-slot="bubble-reactions"
      className={cn('flex items-center gap-1 text-xs text-muted-foreground', className)}
      {...props}
    />
  );
}

export { Bubble, BubbleContent, BubbleGroup, BubbleReactions };

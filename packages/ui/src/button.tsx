import * as React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'default', size = 'md', isLoading, children, className, disabled, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center rounded-full font-medium tracking-tight transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3]/40 focus-visible:ring-offset-2 active:scale-[0.985] disabled:pointer-events-none disabled:opacity-50';

    const variants = {
      default: 'bg-black/[0.88] text-white shadow-[0_1px_2px_rgba(0,0,0,0.18)] hover:bg-black hover:-translate-y-px hover:shadow-[0_6px_18px_rgba(0,0,0,0.2)]',
      outline: 'border border-black/[0.09] bg-white/70 backdrop-blur-xl text-black/80 hover:bg-white/90',
      ghost: 'text-black/60 hover:bg-black/[0.04] hover:text-black/85',
      danger: 'bg-red-500 text-white hover:bg-red-600',
    };

    const sizes = {
      sm: 'h-9 px-4 text-sm',
      md: 'h-10 px-5 py-2',
      lg: 'h-12 px-8',
    };

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className || ''}`}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : null}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

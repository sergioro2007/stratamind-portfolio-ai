import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LoginPage from '../../../components/LoginPage';
import * as authService from '../../../services/authService';

// Mock the auth service
vi.mock('../../../services/authService', () => ({
    login: vi.fn(),
    logout: vi.fn(),
    getCurrentUser: vi.fn(),
    isAuthenticated: vi.fn(),
}));

describe('LoginPage Integration & Coverage', () => {
    const mockLoginSuccess = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        mockLoginSuccess.mockReset();
    });

    it('should show loading state and disable button during login', async () => {
        // Mock login to hang effectively (return a promise that doesn't resolve immediately)
        // or just verify state before await resolves
        let resolveLogin: (value: any) => void;
        const loginPromise = new Promise((resolve) => {
            resolveLogin = resolve;
        });

        vi.mocked(authService.login).mockReturnValue(loginPromise as any);

        render(<LoginPage onLoginSuccess={mockLoginSuccess} />);

        const emailInput = screen.getByPlaceholderText('Enter your email');
        const submitButton = screen.getByRole('button', { name: /sign in/i });

        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.click(submitButton);

        // Expect loading state
        expect(screen.getByText('Signing in...')).toBeInTheDocument();
        expect(submitButton).toBeDisabled();
        expect(emailInput).toBeDisabled();

        // Resolve
        resolveLogin!({ id: '1', email: 'test@example.com' });

        await waitFor(() => {
            expect(mockLoginSuccess).toHaveBeenCalled();
        });
    });

    it('should display error message on login failure', async () => {
        const errorMessage = 'Network error or Invalid credentials';
        vi.mocked(authService.login).mockRejectedValue(new Error(errorMessage));

        render(<LoginPage onLoginSuccess={mockLoginSuccess} />);

        const emailInput = screen.getByPlaceholderText('Enter your email');
        const submitButton = screen.getByRole('button', { name: /sign in/i });

        fireEvent.change(emailInput, { target: { value: 'fail@example.com' } });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText(errorMessage)).toBeInTheDocument();
        });

        // Button should be re-enabled
        expect(submitButton).not.toBeDisabled();
        expect(mockLoginSuccess).not.toHaveBeenCalled();
    });

    it('should handle default error message if error is not Error object', async () => {
        vi.mocked(authService.login).mockRejectedValue('String error');

        render(<LoginPage onLoginSuccess={mockLoginSuccess} />);

        const emailInput = screen.getByPlaceholderText('Enter your email');
        fireEvent.change(emailInput, { target: { value: 'fail@example.com' } });
        fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

        await waitFor(() => {
            expect(screen.getByText('Login failed')).toBeInTheDocument();
        });
    });

    it('should clear previous error on new submission', async () => {
        // First attempt fails
        vi.mocked(authService.login).mockRejectedValueOnce(new Error('First Error'));

        render(<LoginPage onLoginSuccess={mockLoginSuccess} />);
        const emailInput = screen.getByPlaceholderText('Enter your email');
        const submitButton = screen.getByRole('button', { name: /sign in/i });

        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText('First Error')).toBeInTheDocument();
        });

        // Second attempt succeeds
        vi.mocked(authService.login).mockResolvedValue({ id: '1', email: 'test@example.com' });

        // Trigger submit again
        fireEvent.click(submitButton);

        // Error should be gone immediately (before success)
        // Note: The error state is cleared at the start of handleSubmit
        await waitFor(() => {
            expect(screen.queryByText('First Error')).not.toBeInTheDocument();
        });

        await waitFor(() => {
            expect(mockLoginSuccess).toHaveBeenCalled();
        });
    });

    it('should style input border on focus and blur', () => {
        render(<LoginPage onLoginSuccess={mockLoginSuccess} />);
        const emailInput = screen.getByPlaceholderText('Enter your email');

        // Initial style (border color #e2e8f0 from code analysis)
        // Note: inline styles are hard to test with toHaveStyle unless exact.
        // We can trigger events and verify no crash, or check style property.

        fireEvent.focus(emailInput);
        expect(emailInput.style.borderColor).toBe('rgb(102, 126, 234)'); // #667eea

        fireEvent.blur(emailInput);
        expect(emailInput.style.borderColor).toBe('rgb(226, 232, 240)'); // #e2e8f0
    });

    it('should animate button on hover', () => {
        render(<LoginPage onLoginSuccess={mockLoginSuccess} />);
        const submitButton = screen.getByRole('button', { name: /sign in/i });

        fireEvent.mouseEnter(submitButton);
        expect(submitButton.style.transform).toBe('translateY(-2px)');

        fireEvent.mouseLeave(submitButton);
        expect(submitButton.style.transform).toBe('translateY(0)');
    });
});

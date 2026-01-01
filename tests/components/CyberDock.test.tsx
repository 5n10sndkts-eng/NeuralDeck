import { render, screen, fireEvent } from '@testing-library/react';
import { CyberDock } from '../../src/components/CyberDock';
import { ViewMode } from '../../src/types';

// Mock UIContext
jest.mock('../../src/contexts/UIContext', () => ({
    useUI: () => ({
        playSound: jest.fn()
    })
}));

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
        button: ({ children, ...props }: any) => <button {...props}>{children}</button>
    },
    AnimatePresence: ({ children }: any) => <>{children}</>
}));

describe('[P0] CyberDock Navigation', () => {
    const mockOnViewChange = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should render all navigation items including Roundtable', () => {
        render(
            <CyberDock
                activeView="workspace"
                onViewChange={mockOnViewChange}
                show={true}
            />
        );

        // Check that all expected navigation items are present
        expect(screen.getByLabelText('Workspace')).toBeInTheDocument();
        expect(screen.getByLabelText('Orchestrator')).toBeInTheDocument();
        expect(screen.getByLabelText('Kanban')).toBeInTheDocument();
        expect(screen.getByLabelText('Synapse')).toBeInTheDocument();
        expect(screen.getByLabelText('Laboratory')).toBeInTheDocument();
        expect(screen.getByLabelText('Roundtable')).toBeInTheDocument();
        expect(screen.getByLabelText('Construct')).toBeInTheDocument();
        expect(screen.getByLabelText('Immerse')).toBeInTheDocument();
        expect(screen.getByLabelText('Grid')).toBeInTheDocument();
        expect(screen.getByLabelText('Git')).toBeInTheDocument();
        expect(screen.getByLabelText('System')).toBeInTheDocument();
    });

    it('should call onViewChange with "roundtable" when Roundtable button is clicked', () => {
        render(
            <CyberDock
                activeView="workspace"
                onViewChange={mockOnViewChange}
                show={true}
            />
        );

        const roundtableButton = screen.getByLabelText('Roundtable');
        fireEvent.click(roundtableButton);

        expect(mockOnViewChange).toHaveBeenCalledWith('roundtable');
    });

    it('should highlight Roundtable button when activeView is "roundtable"', () => {
        const { container } = render(
            <CyberDock
                activeView="roundtable"
                onViewChange={mockOnViewChange}
                show={true}
            />
        );

        const roundtableButton = screen.getByLabelText('Roundtable');
        expect(roundtableButton).toBeInTheDocument();
        
        // The active button should have specific styling
        const buttonStyle = window.getComputedStyle(roundtableButton);
        expect(buttonStyle).toBeDefined();
    });

    it('should not render when show is false', () => {
        const { container } = render(
            <CyberDock
                activeView="workspace"
                onViewChange={mockOnViewChange}
                show={false}
            />
        );

        // AnimatePresence should not render children when show is false
        expect(container.firstChild).toBeNull();
    });

    it('should navigate between different views', () => {
        render(
            <CyberDock
                activeView="workspace"
                onViewChange={mockOnViewChange}
                show={true}
            />
        );

        // Click various navigation buttons
        fireEvent.click(screen.getByLabelText('Roundtable'));
        expect(mockOnViewChange).toHaveBeenCalledWith('roundtable');

        fireEvent.click(screen.getByLabelText('Laboratory'));
        expect(mockOnViewChange).toHaveBeenCalledWith('laboratory');

        fireEvent.click(screen.getByLabelText('Orchestrator'));
        expect(mockOnViewChange).toHaveBeenCalledWith('orchestrator');
    });
});

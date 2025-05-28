import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HelpTooltip from './HelpTooltip';
import helpData from '../../helpContent.json'; // Import the actual help data

// Mock the helpContent.json module if you don't want to rely on its actual content
// jest.mock('../../helpContent.json', () => ({
//   testKey: 'This is a test help message.',
//   anotherKey: 'Another message.',
// }));
// For Vitest, you might use vi.mock if preferred, but direct import is fine for this test.

describe('HelpTooltip Component', () => {
  const testHelpKey = 'studentForm_firstName'; // Use a valid key from your actual JSON
  const testHelpMessage = helpData[testHelpKey];

  it('renders the help icon', () => {
    render(<HelpTooltip helpKey={testHelpKey} />);
    const helpIcon = screen.getByRole('button', { name: `Help for ${testHelpKey}` });
    expect(helpIcon).toBeInTheDocument();
  });

  it('shows tooltip content on icon click', async () => {
    const user = userEvent.setup();
    render(<HelpTooltip helpKey={testHelpKey} />);
    
    const helpIcon = screen.getByRole('button', { name: `Help for ${testHelpKey}` });
    
    // Tooltip should not be visible initially
    expect(screen.queryByText(testHelpMessage)).not.toBeInTheDocument();
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    await user.click(helpIcon);

    // Tooltip should be visible after click
    expect(screen.getByText(testHelpMessage)).toBeInTheDocument();
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
  });

  it('hides tooltip content on second icon click', async () => {
    const user = userEvent.setup();
    render(<HelpTooltip helpKey={testHelpKey} />);
    const helpIcon = screen.getByRole('button', { name: `Help for ${testHelpKey}` });

    // First click to show
    await user.click(helpIcon);
    expect(screen.getByText(testHelpMessage)).toBeInTheDocument();

    // Second click to hide
    await user.click(helpIcon);
    expect(screen.queryByText(testHelpMessage)).not.toBeInTheDocument();
  });

  it('hides tooltip content on close button click', async () => {
    const user = userEvent.setup();
    render(<HelpTooltip helpKey={testHelpKey} />);
    const helpIcon = screen.getByRole('button', { name: `Help for ${testHelpKey}` });

    // Click to show tooltip
    await user.click(helpIcon);
    expect(screen.getByText(testHelpMessage)).toBeInTheDocument();

    // Click the close button within the tooltip
    const closeButton = screen.getByRole('button', { name: 'Close tooltip' });
    await user.click(closeButton);
    expect(screen.queryByText(testHelpMessage)).not.toBeInTheDocument();
  });
  
  it('hides tooltip content on clicking outside', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <div data-testid="outside-area">Outside</div>
        <HelpTooltip helpKey={testHelpKey} />
      </div>
    );
    const helpIcon = screen.getByRole('button', { name: `Help for ${testHelpKey}` });

    // Click to show tooltip
    await user.click(helpIcon);
    expect(screen.getByText(testHelpMessage)).toBeInTheDocument();
    
    // Click outside
    await user.click(screen.getByTestId('outside-area'));
    expect(screen.queryByText(testHelpMessage)).not.toBeInTheDocument();
  });

   it('displays "Help content not found." if helpKey is invalid', async () => {
    const user = userEvent.setup();
    // Use a type assertion for an invalid key, as the component expects valid keys
    const invalidKey = 'thisKeyDoesNotExist123' as keyof typeof helpData;
    render(<HelpTooltip helpKey={invalidKey} />);
    const helpIcon = screen.getByRole('button', { name: `Help for ${invalidKey}` });
    await user.click(helpIcon);
    expect(screen.getByText('Help content not found.')).toBeInTheDocument();
  });

});

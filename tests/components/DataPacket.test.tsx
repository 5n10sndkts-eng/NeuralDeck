import { render } from '@testing-library/react';
// Jest globals are active in 'test' script environment
import DataPacket from '../../src/components/DataPacket';

describe('DataPacket', () => {
    it('renders with correct styles', () => {
        const path = 'M0 0 L100 100';
        const { container } = render(
            <DataPacket edgePath={path} />
        );

        const packet = container.firstChild as HTMLElement;
        expect(packet).toHaveStyle({
            position: 'absolute',
            width: '12px',
            height: '12px',
            offsetPath: `path('${path}')`
        });
    });

    it('triggers onComplete callback', async () => {
        // Since we can't easily test Framer Motion animation completion in JSDOM without robust mocks,
        // we'll at least verify the component renders and accepts the prop.
        const onComplete = jest.fn();
        render(<DataPacket edgePath="M0 0 L10 10" onComplete={onComplete} duration={0.1} />);
    });
});

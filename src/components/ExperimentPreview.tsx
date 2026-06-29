import { Experiment } from '../data/experiments';

type ExperimentPreviewProps = {
  experiment: Experiment;
};

export function ExperimentPreview({ experiment }: ExperimentPreviewProps) {
  if (experiment.slug === 'crt-login-screen') return <CrtLoginDemo />;
  if (experiment.slug === 'broken-typography-poster') return <BrokenTypeDemo />;
  if (experiment.slug === 'ocean-scan-panel') return <OceanScanDemo />;
  if (experiment.slug === 'liquid-navigation') return <LiquidNavigationDemo />;
  return <PixelWeatherDemo />;
}

function CrtLoginDemo() {
  return (
    <div className="demo-frame crt-demo">
      <div className="crt-panel">
        <div className="crt-panel__bar">
          <span>node://tac0de</span>
          <span>00:13</span>
        </div>
        <div className="crt-panel__body">
          <p className="boot-line">access surface detected</p>
          <p className="boot-line boot-line--delay">loading browser toy index</p>
          <label>
            guest id
            <span className="terminal-input">visitor_<i /></span>
          </label>
        </div>
      </div>
    </div>
  );
}

function BrokenTypeDemo() {
  return (
    <div className="demo-frame broken-type-demo">
      <div className="poster-grid" aria-hidden="true" />
      <div className="broken-word" data-text="BROWSER">
        BROWSER
      </div>
      <div className="poster-caption">offset grid / split type / unstable rhythm</div>
    </div>
  );
}

function OceanScanDemo() {
  return (
    <div className="demo-frame ocean-demo">
      <div className="ocean-map">
        <div className="ocean-region ocean-region--coastal" aria-hidden="true" />
        <div className="ocean-region ocean-region--deep" aria-hidden="true" />
        <div className="ocean-region ocean-region--continent" aria-hidden="true" />
        <div className="contour contour--one" aria-hidden="true" />
        <div className="contour contour--two" aria-hidden="true" />
        <div className="contour contour--three" aria-hidden="true" />
        <div className="depth depth--coastal">coastal shelf / -38m</div>
        <div className="depth depth--ocean">deep ocean / -912m</div>
        <div className="depth depth--continent">continent edge / uplift</div>
        <div className="sonar-ring sonar-ring--one" />
        <div className="sonar-ring sonar-ring--two" />
        <div className="sonar-ring sonar-ring--three" />
        <div className="scan-line" />
        <div className="ocean-hud ocean-hud--top">SCAN TAC-06 / current 2.4kt</div>
        <div className="ocean-hud ocean-hud--bottom">thermal layer: fragmented / node lock 07</div>
        <span className="ocean-node ocean-node--a">34.12N</span>
        <span className="ocean-node ocean-node--b">-129m</span>
        <span className="ocean-node ocean-node--c">ridge</span>
        <span className="ocean-node ocean-node--d">abyss</span>
      </div>
    </div>
  );
}

function LiquidNavigationDemo() {
  return (
    <div className="demo-frame liquid-demo">
      {['lab', 'toys', 'logs'].map((item) => (
        <span key={item}>{item}</span>
      ))}
    </div>
  );
}

function PixelWeatherDemo() {
  return (
    <div className="demo-frame pixel-weather-demo">
      <div className="pixel-sun" />
      <div className="pixel-cloud pixel-cloud--one" />
      <div className="pixel-cloud pixel-cloud--two" />
      <strong>21C</strong>
      <span>scan drizzle</span>
    </div>
  );
}

import { render } from 'preact';
import { App } from './app';
import { startUpdates } from './lib/update';
import './styles.css';

render(<App />, document.getElementById('app')!);
startUpdates();

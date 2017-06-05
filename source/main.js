import "pubsub-js";

(() => {
    const dispatcher = () => {
        PubSub.publish("system.framedraw", 0);
        requestAnimationFrame(dispatcher);
    };
    requestAnimationFrame(dispatcher);
})();

const Ticker = (time, onTick) => {
    const info = {
        get time() {
            return time;
        },
        set time(value) {
            clearInterval(intervalID);
            time = value;
            intervalID = setInterval(tick, info.time);
        },
        onTick,
        stop() {
            if (active === true) {
                clearInterval(intervalID);
                intervalID = null;
                active = false;
            }
        }
    };
    const tick = () => {
        if (active === true) {
            info.onTick();
        }
    };
    let active = true;
    let intervalID = null;

    intervalID = setInterval(tick, info.time);

    return info;
};

App.styleSheet.addStyles({
    "div.damage": {
        animationDuration: '1350ms',
        animationName: 'test',
        animationTimingFunction: 'linear',
        position: 'absolute',
        top: '50%',
        left: '65%',
        height: '50%'
    },
    "@keyframes test": {
        '0%': {
            transform: 'translateY(0)',
            opacity: 1
        },
        '100%': {
            transform: 'translateY(-100%)',
            opacity: 0.25
        }
    },
    "doric-progress.enemy": {
        transform: 'rotate(180deg)'
    },
    "doric-progress.enemy doric-progress-bar": {
        backgroundColor: 'red'
    }
});
class CombatScreen extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            enemy: {},
            list: []
        };
    }

    componentDidMount = () => {
        PubSub.subscribe(
            "game.player.attack",
            (evt, {damage}) => {
                const {list} = this.state;

                const factor = ((Math.random() - 0.5) * Math.E * 0.02) * damage;
                damage += factor;
                damage = Math.floor(damage);
                damage = Math.max(1, damage);
                list.push({damage, time: Date.now()});
                chrono.trigger(
                    1250,
                    () => {
                        list.shift();
                        this.setState({list});
                    }
                );
                combat.tick(damage, null);
                this.setState({list});
            }
        );
        PubSub.subscribe(
            "game.enemy.attack",
            (evt, {damage}) => {
                combat.tick(null, damage);
                this.setState({time: Date.now()});
            }
        )
    }

    render = () => {
        const {list} = this.state;
        const {player, enemy} = this.props;

        return (
            <div key="0">
                {list.map(i => <div className="damage" key={i.time}>{i.damage}</div>)}
                <Doric.Progress progress={player.hp / player.maxHP} />
                <Doric.Progress progress={enemy.hp / enemy.maxHP} className="enemy" />
            </div>
        );
    }
}

class GameScreen extends React.Component {
    constructor(props) {
        super(props);
    }

    updatePow = () => {
        playerStats.pow += 1;
        this.forceUpdate();
    }

    render = () => {
        return (
            <div>
                <Doric.Button text={playerStats.pow} onTap={this.updatePow} />
            </div>
        );
    }
}

const combat = (() => {
    let active = false;

    return {
        start() {
            window.playerAttack = Ticker(
                1500,
                () => PubSub.publish("game.player.attack", {damage: playerStats.pow})
            );
            window.enemyAttack = Ticker(
                1500,
                () => PubSub.publish("game.enemy.attack", {damage: enemyStats.pow})
            );
            active = true;
        },
        get active() {
            return active;
        },
        tick (playerDamage, enemyDamage) {
            if (active === false) {
                return;
            }

            if (playerDamage !== null) {
                enemyStats.hp = Math.max(0, enemyStats.hp - playerDamage);
            }
            if (enemyDamage !== null) {
                playerStats.hp = Math.max(0, playerStats.hp - enemyDamage);
            }

            if (enemyStats.hp === 0 || playerStats.hp === 0) {
                enemyAttack.stop();
                playerAttack.stop();
                active = false;
                console.log('dead');
            }
        }
    };
})();

const playerStats = {
    pow: 10,
    speed: 1,
    maxHP: 50,
    hp: 50
};
let enemyStats = {
    pow: 5,
    speed: 1,
    maxHP: 50,
    hp: 50
};

class Main extends React.Component {
    constructor(props) {
        super(props);
    }

    componentDidMount = () => {
        combat.start();
    }

    render = () => {
        return (
            <Doric.Screen title="Auto Battle">
                <Doric.Pinboard width="100%" height="100%">
                    <CombatScreen pinStyle={{top: 0, left: 0, right: 0, height: '50%'}} player={playerStats} enemy={enemyStats} />
                    <GameScreen pinStyle={{bottom: 0, left: 0, right: 0, height: '50%'}} stats={playerStats} />
                </Doric.Pinboard>
            </Doric.Screen>
        );
    }
}

App.start(
    <Route path="/" component={Main} />
);

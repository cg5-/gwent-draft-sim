import React, { Component } from "react";
import _ from "underscore";
import ReactTooltip from "react-tooltip"
import { Button, Modal, Glyphicon } from "react-bootstrap";

import "./App.css";
import cards from "./cards.js"

let factions = ["Scoia'tael", "Nilfgaard", "Monster", "Northern Realms", "Skellige"];
let colours = ["Bronze", "Silver", "Gold"];
let sequence = ["Gold", "Bronze", "Bronze", "Bronze", "Silver", "Bronze", "Bronze", "Bronze", "Silver", "Bronze", "Bronze", "Gold", "Bronze", "Bronze", "Silver"];
let cardLimit = {Bronze: 3, Silver: 1, Gold: 1};

function count(list, name) {
	let result = 0;
	for (let card of list) {
		if (card.name === name) {
			result++;
		}
	}
	return result;
}

class App extends Component {
	constructor(props) {
		super(props);
		this.state = {decklist: [], generator: this.generator(), showModal: false};
	}

	componentWillMount() {
		this.advance();
	}

	render() {
		let state = this.state;
		return (
			<div className="container">
				<Button bsClass="btn help-button" onClick={() => this.setState({showModal: true})}><Glyphicon glyph="question-sign" /></Button>
				<h1>Gwent Draft Simulator</h1>
				<div className="picker-column">
				<p className="picker-header">{state.header}</p>
				{state.done ? null : <Picker cards={state.cards} toChoose={state.toChoose} onComplete={this.pickerCompleted.bind(this)} />}
				</div>
				<div className="decklist-column">
					<Decklist cards={state.decklist} />
				</div>

				<Modal show={this.state.showModal} onHide={() => this.setState({showModal: false})}>
					<Modal.Header closeButton>
						<Modal.Title>Gwent Draft Simulator</Modal.Title>
					</Modal.Header>
					<Modal.Body>
						<ul>
							<li>Based on Merchant&apos;s draft design - <a href="https://www.youtube.com/watch?v=r1uuRJoRpB8">Watch on YouTube</a></li>
							<li>You pick two cards from each of 15 kegs for a total of 30 cards.</li>
							<li>Faction specific cards show up twice as often as neutral cards.</li>
							<li>
								You can be offered multiple copies of the same bronze card in the same keg, but not if it
								would allow you to put more than three in your deck.
							</li>
						</ul>
						<hr />
						<ul>
							<li><a href="https://github.com/cg5-/gwent-draft-sim">Source code</a></li>
							<li>Thanks to <a href="https://gwentapi.com/">GwentAPI</a></li>
						</ul>
					</Modal.Body>
				</Modal>
			</div>
		);
	}

	*generator() {
		let faction = (yield {
			header: "Choose a leader",
			cards: _.sample(_.flatten(factions.map(faction => cards[faction].Leader), true), 4),
			toChoose: 1
		})[0].faction;

		let pool = {};
		for (let colour of colours) {
			// Insert faction cards twice so that they're twice as likely to show up
			pool[colour] = _.flatten([cards.Neutral[colour], cards[faction][colour], cards[faction][colour]], true);
		}

		for (let i = 0; i < sequence.length; i++) {
			let colour = sequence[i];
			let keg = [];
			while (keg.length < 5) {
				let card = _.sample(pool[colour]);
				if (count(this.state.decklist, card.name) + count(keg, card.name) < cardLimit[colour]) {
					keg.push(card);
				}
			}

			yield {
				header: `Keg ${i + 1}/${sequence.length} - Choose 2 cards`,
				cards: keg,
				toChoose: 2
			}
		}
	}

	advance(cards=[]) {
		let {value, done} = this.state.generator.next(cards);
		if (done) {
			this.setState({done: true, header: "Completed"});
		} else {
			this.setState(value);
		}
	}

	pickerCompleted(chosen) {
		let decklist = this.state.decklist;
		for (let card of chosen) {
			decklist.push(card);
		}
		this.setState({decklist});
		this.advance(chosen);
	}
}

function newlineToBr(text) {
	return text.split(/\n+/g).map((item, idx) => item === "" ? null : <p key={idx}>{item}</p>);
}
 
class Card extends Component {
	render() {
		let card = this.props.card;
		return (
			<div className={"card " + card.group.toLowerCase()}>
				<img className="card-image" src={card.arts[0]} alt={card.name} />
				<p className="segment card-name">{card.name}</p>
				{card.subtypes === "" ? null : <p className="segment card-subtypes">{card.subtypes}</p>}
				<div className="segment card-text">{newlineToBr(card.text)}</div>
			</div>
		);
	}
}

class Picker extends Component {
	constructor(props) {
		super(props);
		this.state = {chosen: []}
	}

	render() {
		let chosen = this.state.chosen;
		return (
			<div className="picker">
				{this.props.cards.map((card, idx) =>
					<div key={`${card.name}_${idx}`} className={"picker-card-container " + (_.contains(chosen, idx) ? "chosen" : "")} onClick={this.clicked.bind(this, idx)}>
						<Card card={card} />
					</div>
				)}
			</div>
		)
	}

	clicked(idx) {
		let chosen = this.state.chosen;
		if (_.contains(chosen, idx)) {
			chosen = _.without(chosen, idx);
		} else {
			chosen.push(idx);
		}

		if (chosen.length === this.props.toChoose) {
			this.props.onComplete(chosen.map(i => this.props.cards[i]));
			this.setState({chosen: []});
		} else {
			this.setState({chosen});
		}
	}
}

let groupSort = {
	Leader: 0,
	Gold: 1,
	Silver: 2,
	Bronze: 3
}

class Decklist extends Component {
	render() {
		let counts = _.map(_.groupBy(this.props.cards, "name"), (group, name) => ({count: group.length, card: group[0]}));
		let sorted = _.sortBy(counts, o => groupSort[o.card.group]);

		return (
			<div className="decklist">
				{sorted.map(({count, card}) => <DecklistCard key={card.name} card={card} count={count} />)}
			</div>
		);
	}
}

class DecklistCard extends Component {
	render() {
		return (
			<div data-tip data-for={this.props.card.name} className={"decklist-card " + this.props.card.group.toLowerCase()}>
				<span className="decklist-card-name">{this.props.card.name}</span>
				{this.props.count > 1 ? <span className="decklist-card-count">x{this.props.count}</span> : null}
				<ReactTooltip id={this.props.card.name} className="card-tooltip">
					<Card card={this.props.card} />
				</ReactTooltip>
			</div>
		);
	}
}

export default App;
